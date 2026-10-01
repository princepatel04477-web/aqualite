import { NextResponse } from "next/server";
import { z } from "zod";

import { readCartId } from "@/lib/cart/cookie";
import { isDemoPayments } from "@/lib/env";
import { logger } from "@/lib/logger";
import { fetchProviderPayment, verifyCheckoutSignature } from "@/lib/payments/razorpay";
import {
  clearCart,
  confirmPayment,
  findOrderForPayment,
  markConfirmationSent,
  recordOutbox,
} from "@/lib/store/engine";

const bodySchema = z.object({
  razorpay_order_id: z.string().min(3),
  razorpay_payment_id: z.string().min(3),
  razorpay_signature: z.string().min(8),
});

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;
  if (!verifyCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    logger.warn("payment.verify_bad_signature", { razorpay_order_id });
    return NextResponse.json({ ok: false, error: "INVALID_SIGNATURE" }, { status: 400 });
  }

  const order = await findOrderForPayment(razorpay_order_id);
  if (!order) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  let verifiedAmount = order.totalPaise;
  if (!isDemoPayments()) {
    const payment = await fetchProviderPayment(razorpay_payment_id);
    if (!payment || payment.order_id !== razorpay_order_id) {
      return NextResponse.json({ ok: false, error: "PAYMENT_PROVIDER_UNAVAILABLE" }, { status: 502 });
    }
    verifiedAmount = payment.amount;
  }

  const confirmed = await confirmPayment(order.id, razorpay_payment_id, verifiedAmount, "api-verify");
  if (!confirmed.ok) {
    return NextResponse.json({ ok: false, error: confirmed.error.code }, { status: 409 });
  }

  const cartId = await readCartId();
  if (cartId) await clearCart(cartId);

  const first = await markConfirmationSent(order.id);
  if (first) {
    await recordOutbox(
      order.email,
      `Order ${order.number} paid`,
      `Payment received for ${order.number}. Total ${(order.totalPaise / 100).toFixed(0)} INR.`,
    );
  }

  return NextResponse.json({
    ok: true,
    number: order.number,
    accessToken: order.accessToken,
    status: confirmed.data.status,
  });
}
