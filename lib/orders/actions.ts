"use server";

import { z } from "zod";

import { readCartId } from "@/lib/cart/cookie";
import { errorCopy } from "@/content/errors";
import { readSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { limitCart, limitIp } from "@/lib/rate-limit";
import { err, ok, unexpected, type Result } from "@/lib/result";
import {
  attachRazorpay,
  clearCart,
  confirmPayment,
  failPayment,
  findOrderForPayment,
  getOrderByNumber,
  markConfirmationSent,
  placeOrder,
  quoteFor,
  recordOutbox,
} from "@/lib/store/engine";
import { isDemoPayments, serverEnv } from "@/lib/env";
import { createProviderOrder, fetchProviderPayment, verifyCheckoutSignature } from "@/lib/payments/razorpay";

const addressSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  line1: z.string().min(4).max(120),
  line2: z.string().max(120).default(""),
  landmark: z.string().max(80).default(""),
  city: z.string().min(2).max(60),
  state: z.string().min(2).max(60),
  pincode: z.string().regex(/^[1-9]\d{5}$/),
});

const checkoutSchema = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  address: addressSchema,
  method: z.enum(["razorpay", "cod"]),
  idempotencyKey: z.string().uuid(),
});

export type CheckoutResult = {
  orderNumber: string;
  accessToken: string;
  method: "razorpay" | "cod";
  totalPaise: number;
  demo: boolean;
  orderId: string;
  razorpayOrderId: string | null;
  keyId: string | null;
};

export async function startCheckout(input: unknown): Promise<Result<CheckoutResult>> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  const cartId = await readCartId();
  if (!cartId) return err("EMPTY_CART", errorCopy.EMPTY_CART);
  if (await limitIp("checkout", 10, 60)) return err("RATE_LIMITED", errorCopy.RATE_LIMITED);
  if (await limitCart(cartId, 10)) return err("RATE_LIMITED", errorCopy.RATE_LIMITED);
  const session = await readSession();
  try {
    const placed = await placeOrder({
      cartId,
      email: parsed.data.email,
      phone: parsed.data.phone,
      address: parsed.data.address,
      method: parsed.data.method,
      idempotencyKey: parsed.data.idempotencyKey,
      userId: session?.id ?? null,
    });
    if (!placed.ok) return placed;
    if (parsed.data.method === "cod") {
      await clearCart(cartId);
      const first = await markConfirmationSent(placed.data.id);
      if (first) {
        await recordOutbox(
          placed.data.email,
          `Order ${placed.data.number} confirmed`,
          `Thank you. ${placed.data.number} is confirmed for cash on delivery. Total ${placed.data.totalPaise / 100} INR.`,
        );
      }
      return ok({
        orderNumber: placed.data.number,
        accessToken: placed.data.accessToken,
        method: placed.data.paymentMethod,
        totalPaise: placed.data.totalPaise,
        demo: false,
        orderId: placed.data.id,
        razorpayOrderId: null,
        keyId: null,
      });
    }
    if (isDemoPayments()) {
      return ok({
        orderNumber: placed.data.number,
        accessToken: placed.data.accessToken,
        method: placed.data.paymentMethod,
        totalPaise: placed.data.totalPaise,
        demo: true,
        orderId: placed.data.id,
        razorpayOrderId: null,
        keyId: null,
      });
    }
    const provider = await createProviderOrder(placed.data.totalPaise, placed.data.number);
    if (!provider) {
      await failPayment(placed.data.id, "provider order failed");
      return err("PAYMENT_PROVIDER_UNAVAILABLE", errorCopy.PAYMENT_PROVIDER_UNAVAILABLE);
    }
    await attachRazorpay(placed.data.id, provider.id);
    return ok({
      orderNumber: placed.data.number,
      accessToken: placed.data.accessToken,
      method: placed.data.paymentMethod,
      totalPaise: placed.data.totalPaise,
      demo: false,
      orderId: placed.data.id,
      razorpayOrderId: provider.id,
      keyId: serverEnv.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    const requestId = crypto.randomUUID().slice(0, 8);
    logger.error("checkout.failed", { requestId, message: error instanceof Error ? error.message : "unknown" });
    return unexpected(requestId);
  }
}

export async function confirmDemoPayment(input: unknown): Promise<Result<{ number: string; accessToken: string }>> {
  const parsed = z.object({ number: z.string().min(4) }).safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  if (!isDemoPayments()) return err("PAYMENT_PROVIDER_UNAVAILABLE", errorCopy.PAYMENT_PROVIDER_UNAVAILABLE);
  const order = await getOrderByNumber(parsed.data.number);
  if (!order) return err("NOT_FOUND", errorCopy.NOT_FOUND);
  const confirmed = await confirmPayment(order.id, `demo_${order.id}`, order.totalPaise, "demo-verify");
  if (!confirmed.ok) return confirmed;
  const cartId = await readCartId();
  if (cartId) await clearCart(cartId);
  const first = await markConfirmationSent(order.id);
  if (first) {
    await recordOutbox(order.email, `Order ${order.number} paid`, `Payment received for ${order.number}.`);
  }
  return ok({ number: order.number, accessToken: order.accessToken });
}

const razorpayReturn = z.object({
  razorpay_order_id: z.string().min(3),
  razorpay_payment_id: z.string().min(3),
  razorpay_signature: z.string().min(8),
});

export async function confirmRazorpayPayment(
  input: unknown,
): Promise<Result<{ number: string; accessToken: string }>> {
  const parsed = razorpayReturn.safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  if (
    !verifyCheckoutSignature(
      parsed.data.razorpay_order_id,
      parsed.data.razorpay_payment_id,
      parsed.data.razorpay_signature,
    )
  ) {
    return err("VALIDATION", errorCopy.VALIDATION);
  }
  const order = await findOrderForPayment(parsed.data.razorpay_order_id);
  if (!order) return err("NOT_FOUND", errorCopy.NOT_FOUND);
  const payment = await fetchProviderPayment(parsed.data.razorpay_payment_id);
  if (!payment || payment.order_id !== parsed.data.razorpay_order_id) {
    return err("PAYMENT_PROVIDER_UNAVAILABLE", errorCopy.PAYMENT_PROVIDER_UNAVAILABLE);
  }
  const confirmed = await confirmPayment(order.id, payment.id, payment.amount, "razorpay-verify");
  if (!confirmed.ok) return confirmed;
  const cartId = await readCartId();
  if (cartId) await clearCart(cartId);
  const first = await markConfirmationSent(order.id);
  if (first) {
    await recordOutbox(order.email, `Order ${order.number} paid`, `Payment received for ${order.number}.`);
  }
  return ok({ number: order.number, accessToken: order.accessToken });
}

export async function quoteCheckout(method: "razorpay" | "cod") {
  const cartId = await readCartId();
  if (!cartId) return err("EMPTY_CART", errorCopy.EMPTY_CART);
  return quoteFor(cartId, method);
}

export async function loadOrder(number: string, token: string | undefined) {
  const order = await getOrderByNumber(number);
  if (!order) return null;
  const session = await readSession();
  if (session?.id && session.id === order.userId) return order;
  if (session?.role === "admin") return order;
  if (token && token === order.accessToken) return order;
  return null;
}


