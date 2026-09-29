import "server-only";

import { isDemoEmail, serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { recordOutbox } from "@/lib/store/engine";

export type EmailInput = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

/**
 * Sends through Resend when the key is real; otherwise the message lands in
 * the local outbox (demo mode) so nothing is ever lost silently.
 */
export async function sendEmail(input: EmailInput): Promise<{ demo: boolean }> {
  if (isDemoEmail()) {
    await recordOutbox(input.to, input.subject, input.text);
    return { demo: true };
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(serverEnv.RESEND_API_KEY);
    await resend.emails.send({
      from: serverEnv.EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      ...(input.replyTo ? { reply_to: [input.replyTo] } : {}),
    });
    return { demo: false };
  } catch (error) {
    logger.error("email.send_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    await recordOutbox(input.to, input.subject, input.text);
    return { demo: true };
  }
}

/** Inbound reply address for a thread — Resend routes replies back to us. */
export function inboundReplyAddress(threadId: string): string {
  const host = serverEnv.SITE_URL.replace(/^https?:\/\//, "");
  return `inbound+${threadId}@${host}`;
}
