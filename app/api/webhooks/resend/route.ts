import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env";
import { handleResendInbound, type InboundHeaders } from "@/lib/email/inbound";
import { logger } from "@/lib/logger";

/**
 * POST /api/webhooks/resend — inbound email (svix-signed `email.received`).
 * Customer replies addressed to `inbound+<threadId>@…` land back on the thread.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const payloadText = await request.text();
  const headers: InboundHeaders = {
    svixId: request.headers.get("svix-id"),
    svixTimestamp: request.headers.get("svix-timestamp"),
    svixSignature: request.headers.get("svix-signature"),
  };
  const result = await handleResendInbound(
    payloadText,
    headers,
    serverEnv.RESEND_WEBHOOK_SECRET ?? "",
  );
  if (result.ok) {
    return NextResponse.json({ ok: true, threadId: result.threadId });
  }
  if (result.code === "BAD_SIGNATURE") {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  logger.warn("resend.webhook_unhandled", { code: result.code });
  return NextResponse.json({ ok: false, code: result.code }, { status: result.code === "NO_THREAD" ? 202 : 400 });
}
