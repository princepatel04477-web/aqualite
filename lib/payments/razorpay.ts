import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

function signaturesMatch(expected: string, received: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const expected = createHmac("sha256", serverEnv.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  return signaturesMatch(expected, signature);
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = createHmac("sha256", serverEnv.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return signaturesMatch(expected, signature);
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${serverEnv.RAZORPAY_KEY_ID}:${serverEnv.RAZORPAY_KEY_SECRET}`).toString("base64")}`;
}

export async function createProviderOrder(
  amountPaise: number,
  receipt: string,
): Promise<{ id: string } | null> {
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt }),
  });
  if (!response.ok) {
    logger.error("razorpay.order_failed", { status: response.status });
    return null;
  }
  const json: unknown = await response.json();
  const parsed = z.object({ id: z.string().min(3) }).safeParse(json);
  return parsed.success ? { id: parsed.data.id } : null;
}

const paymentSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  amount: z.number().int(),
  status: z.string(),
});

export async function fetchProviderPayment(paymentId: string): Promise<z.infer<typeof paymentSchema> | null> {
  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: { Authorization: authHeader() },
  });
  if (!response.ok) return null;
  const json: unknown = await response.json();
  const parsed = paymentSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
