import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env";
import { accountHealth } from "@/lib/hub/reports/health";
import { logger } from "@/lib/logger";
import { syncSettlements } from "@/lib/payments/settlements";
import {
  listEvents,
  listOrders,
  listThreads,
  listMessagesForReport,
  listReturnsForReport,
  listReviewsForReport,
  rollupDailyProductStats,
  saveHealthSnapshot,
  getSettings,
} from "@/lib/store/engine";
import { istDayAdd, istDayOf } from "@/lib/time/ist";

function authorized(request: Request): boolean {
  const secret = serverEnv.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const alt = request.headers.get("x-cron-secret") ?? "";
  return header === `Bearer ${secret}` || alt === secret;
}

/**
 * Daily cron (GET or POST): settlement pull + reconciliation, nightly event
 * rollup into daily_product_stats, and an account-health snapshot.
 */
export async function GET(request: Request): Promise<NextResponse> {
  return run(request);
}

export async function POST(request: Request): Promise<NextResponse> {
  return run(request);
}

async function run(request: Request): Promise<NextResponse> {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const settlements = await syncSettlements();

    // Nightly rollup — the last 3 days, to catch late-arriving events.
    const today = istDayOf(new Date().toISOString());
    const days = [istDayAdd(today, -2), istDayAdd(today, -1), today];
    const rolled = await rollupDailyProductStats(days);

    // Account health snapshot (on-demand computes use the same maths).
    const [orders, events, returns, reviews, threads, messages, settings] = await Promise.all([
      listOrders(),
      listEvents("2000-01-01T00:00:00.000Z", "2100-01-01T00:00:00.000Z"),
      listReturnsForReport(),
      listReviewsForReport(),
      listThreads(),
      listMessagesForReport(),
      getSettings(),
    ]);
    const metrics = accountHealth({
      orders,
      returns,
      reviews,
      threads,
      messages,
      shipByDays: settings.shipByDays,
    });
    await saveHealthSnapshot(
      Object.fromEntries(metrics.map((metric) => [metric.key, metric.valueBps ?? metric.valueHours ?? 0])),
    );

    return NextResponse.json({ ok: true, settlements, rolled, events: events.length });
  } catch (error) {
    const requestId = crypto.randomUUID().slice(0, 8);
    logger.error("cron.settlements_failed", {
      requestId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false, requestId }, { status: 500 });
  }
}
