import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env";
import { drainNotifyQueue, recordOutbox } from "@/lib/store/engine";

async function handle(request: Request) {
  if (!serverEnv.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${serverEnv.CRON_SECRET}`) {
    return NextResponse.json({ message: "Unauthorised" }, { status: 401 });
  }
  const queued = await drainNotifyQueue();
  for (const entry of queued) {
    await recordOutbox(
      entry.email,
      "Back in stock at Aqualite",
      `The size you requested (${entry.variantId}) is back in stock at Aqualite.`,
    );
  }
  return NextResponse.json({ notified: queued.length });
}

export const GET = handle;
export const POST = handle;
