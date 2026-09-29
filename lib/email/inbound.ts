import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import { logger } from "@/lib/logger";
import {
  appendMessage,
  findThreadByReplyAddress,
  setThreadStatus,
} from "@/lib/store/engine";

export type InboundHeaders = {
  svixId: string | null;
  svixTimestamp: string | null;
  svixSignature: string | null;
};

export type InboundResult =
  | { ok: true; threadId: string; messageId: string }
  | { ok: false; code: "BAD_SIGNATURE" | "PAYLOAD" | "NO_THREAD" };

/** Svix-style signature: HMAC-SHA256 over `id.timestamp.body`, base64, `v1,...`. */
export function verifyInboundSignature(
  payloadText: string,
  headers: InboundHeaders,
  secret: string,
): boolean {
  const { svixId, svixTimestamp, svixSignature } = headers;
  if (!svixId || !svixTimestamp || !svixSignature) return false;
  const expected = createHmac("sha256", secret)
    .update(`${svixId}.${svixTimestamp}.${payloadText}`)
    .digest("base64");
  const candidates = svixSignature.split(",").map((part) => part.replace(/^v\d+,/, "").trim());
  return candidates.some((candidate) => {
    if (candidate.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
  });
}

function addressOf(value: string | { email?: string; name?: string } | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value.toLowerCase();
  return (value.email ?? "").toLowerCase();
}

/**
 * Resend inbound (`email.received`): find the thread by its `inbound+<id>@`
 * reply address (or the In-Reply-To token), append the customer's reply and
 * reopen the thread.
 */
export async function handleResendInbound(
  payloadText: string,
  headers: InboundHeaders,
  secret: string,
): Promise<InboundResult> {
  if (!secret || !verifyInboundSignature(payloadText, headers, secret)) {
    return { ok: false, code: "BAD_SIGNATURE" };
  }
  let payload: {
    data?: {
      from?: string | { email?: string; name?: string };
      to?: (string | { email?: string })[];
      text?: string;
      html?: string;
      headers?: Record<string, string>;
    };
    from?: string | { email?: string };
    to?: (string | { email?: string })[];
    text?: string;
    html?: string;
    headers?: Record<string, string>;
  };
  try {
    payload = JSON.parse(payloadText) as typeof payload;
  } catch {
    return { ok: false, code: "PAYLOAD" };
  }
  const data = payload.data ?? payload;
  const toList = (data.to ?? []).map((entry) => addressOf(entry));
  const tokenFromAddress = toList
    .map((address) => /inbound\+([^@]+)@/.exec(address)?.[1] ?? "")
    .find(Boolean);
  const headerToken = /inbound\+([a-z0-9_]+)/i.exec(
    `${data.headers?.["in-reply-to"] ?? ""} ${data.headers?.references ?? ""}`,
  )?.[1];
  const token = tokenFromAddress ?? headerToken ?? "";
  const thread = token ? await findThreadByReplyAddress(token) : null;
  if (!thread) {
    logger.warn("email.inbound_no_thread", { token: token.slice(0, 24) });
    return { ok: false, code: "NO_THREAD" };
  }
  const body = (data.text ?? stripHtml(data.html ?? "")).trim().slice(0, 8000);
  const saved = await appendMessage({
    threadId: thread.id,
    direction: "in",
    body: body || "(no content)",
    sentVia: "webhook",
  });
  if (!saved.ok) return { ok: false, code: "PAYLOAD" };
  await setThreadStatus(thread.id, "open");
  return { ok: true, threadId: thread.id, messageId: saved.data.id };
}

function stripHtml(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}
