"use server";

import { z } from "zod";

import { errorCopy } from "@/content/errors";
import { readSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { err, ok, unexpected, type Result } from "@/lib/result";
import {
  appendMessage,
  createThread,
  getOrderByNumber,
  getThreadWithMessages,
  threadsForOrder,
  type MessageRecord,
  type MessageThread,
} from "@/lib/store/engine";

const messageSchema = z.object({
  orderNumber: z.string().min(1),
  body: z.string().trim().min(1).max(8000),
});

/**
 * Customer writes to support about their order — lands on the seller's inbox
 * thread for that order (creating the first one if needed).
 */
export async function sendOrderMessageAction(input: unknown): Promise<Result<{ threadId: string }>> {
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  try {
    const session = await readSession();
    if (!session) return err("UNAUTHORIZED", errorCopy.UNAUTHORIZED);
    const order = await getOrderByNumber(parsed.data.orderNumber);
    if (!order || order.userId !== session.id) return err("NOT_FOUND", errorCopy.NOT_FOUND);

    const existing = await threadsForOrder(order.id);
    const open = existing.find((thread) => thread.status !== "closed") ?? existing[0];
    if (open) {
      const saved = await appendMessage({
        threadId: open.id,
        direction: "in",
        body: parsed.data.body,
        sentVia: "form",
      });
      return saved.ok ? ok({ threadId: open.id }) : err("NOT_FOUND", errorCopy.NOT_FOUND);
    }
    const created = await createThread({
      orderId: order.id,
      customerEmail: order.email,
      subject: `Question about ${order.number}`,
      body: parsed.data.body,
      direction: "in",
      sentVia: "form",
    });
    return ok({ threadId: created.thread.id });
  } catch (error) {
    const requestId = crypto.randomUUID().slice(0, 8);
    logger.error("account.message_failed", {
      requestId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return unexpected(requestId);
  }
}

export async function orderThread(
  orderNumber: string,
): Promise<{ thread: MessageThread; messages: MessageRecord[] } | null> {
  const session = await readSession();
  if (!session) return null;
  const order = await getOrderByNumber(orderNumber);
  if (!order || order.userId !== session.id) return null;
  const threads = await threadsForOrder(order.id);
  const thread = threads[0];
  if (!thread) return null;
  return getThreadWithMessages(thread.id);
}
