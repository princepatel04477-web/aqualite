import { NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import {
  confirmPayment,
  failPayment,
  findOrderForPayment,
  markConfirmationSent,
  recordOutbox,
  rememberPaymentEvent,
} from "@/lib/store/engine";

const payloadSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string(),
        order_id: z.string(),
        amount: z.number().int(),
        status: z.string(),
      }),
    }),
  }),
});

export async function POST(request: Request): Promise<NextResponse> {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!signature || !verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const eventId = request.headers.get("x-razorpay-event-id") ?? "";
  if (eventId && !(await rememberPaymentEvent(eventId))) {
    return NextResponse.json({ ok: true, duplicate: true });
  }
  let json: unknown;
  try {
    json = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: true, ignored: true });
  const payment = parsed.data.payload.payment.entity;
  const order = await findOrderForPayment(payment.order_id);
  if (!order) {
    logger.warn("razorpay.webhook_unknown_order", { event: parsed.data.event });
    return NextResponse.json({ ok: true, unknown: true });
  }
  if (parsed.data.event === "payment.captured" || parsed.data.event === "order.paid") {
    const confirmed = await confirmPayment(order.id, payment.id, payment.amount, "razorpay-webhook");
    if (confirmed.ok && confirmed.data.status !== "needs_attention") {
      const first = await markConfirmationSent(order.id);
      if (first) {
        await recordOutbox(order.email, `Order ${order.number} paid`, `Payment received for ${order.number}.`);
      }
    }
    return NextResponse.json({ ok: true });
  }
  if (parsed.data.event === "payment.failed") {
    await failPayment(order.id, "provider reported failure");
  }
  return NextResponse.json({ ok: true });
}
