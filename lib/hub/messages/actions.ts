"use server";

import { z } from "zod";

import { isDemoEmail } from "@/lib/env";
import { inboundReplyAddress, sendEmail } from "@/lib/email/send";
import {
  appendMessage,
  getThreadWithMessages,
  listSavedReplies,
  saveSavedReply,
  deleteSavedReply,
  setThreadStatus,
  type MessageThread,
  type SavedReply,
} from "@/lib/store/engine";
import { logger } from "@/lib/logger";
import { err, ok, unexpected, type Result } from "@/lib/result";
import { errorCopy } from "@/content/errors";

const replySchema = z.object({
  threadId: z.string().min(1),
  body: z.string().trim().min(1).max(8000),
  templateId: z.string().optional(),
});

export type ReplyOutcome = {
  thread: MessageThread;
  demo: boolean;
};

/** Seller reply — sends via Resend (or the demo outbox) and logs it on the thread. */
export async function replyToThread(input: unknown): Promise<Result<ReplyOutcome>> {
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  try {
    const { threadId, body, templateId } = parsed.data;
    const found = await getThreadWithMessages(threadId);
    if (!found) return err("NOT_FOUND", errorCopy.NOT_FOUND);
    let text = body;
    if (templateId) {
      const templates = await listSavedReplies();
      const template = templates.find((row) => row.id === templateId);
      if (template) text = `${body}\n\n—\n${template.body}`.trim();
    }
    const saved = await appendMessage({
      threadId,
      direction: "out",
      body: text,
      sentVia: "resend",
    });
    if (!saved.ok) return err("NOT_FOUND", errorCopy.NOT_FOUND);
    const sent = await sendEmail({
      to: found.thread.customerEmail,
      subject: `Re: ${found.thread.subject}`,
      text,
      replyTo: inboundReplyAddress(threadId),
    });
    await setThreadStatus(threadId, "waiting");
    return ok({ thread: { ...found.thread, status: "waiting" }, demo: sent.demo });
  } catch (error) {
    const requestId = crypto.randomUUID().slice(0, 8);
    logger.error("hub.reply_failed", {
      requestId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return unexpected(requestId);
  }
}

export async function closeThread(threadId: string): Promise<Result<MessageThread>> {
  return setThreadStatus(threadId, "closed");
}

export async function savedReplies(): Promise<SavedReply[]> {
  return listSavedReplies();
}

export async function createSavedReply(
  title: string,
  body: string,
): Promise<Result<SavedReply>> {
  return saveSavedReply({ title, body });
}

export async function removeSavedReply(id: string): Promise<Result<{ id: string }>> {
  const removed = await deleteSavedReply(id);
  return removed ? ok({ id }) : err("NOT_FOUND", errorCopy.NOT_FOUND);
}

export async function replyChannel(): Promise<"demo" | "resend"> {
  return isDemoEmail() ? "demo" : "resend";
}
