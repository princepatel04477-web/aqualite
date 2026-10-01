import { NextResponse } from "next/server";

import { buildEvent, isBot, hashIpDaily, trackBatchSchema } from "@/lib/analytics/track";
import { logger } from "@/lib/logger";
import { limitIp } from "@/lib/rate-limit";
import { catalogProducts, recordEvents, type AnalyticsEvent } from "@/lib/store/engine";

/** PDP page views carry their product id even though the beacon stays tiny. */
async function resolvePageProduct(event: AnalyticsEvent): Promise<AnalyticsEvent> {
  if (event.type !== "page_view" || event.productId) return event;
  const match = /^\/product\/([a-z0-9-]+)/.exec(event.path);
  if (!match) return event;
  const products = await catalogProducts();
  const product = products.find((item) => item.slug === match[1]);
  return product ? { ...event, productId: product.id } : event;
}

/**
 * POST /api/track — first-party event ingest (sendBeacon).
 * Zod-validated, bot-filtered, rate-limited. Accepts a single event or a
 * small batch. Never logs or stores the IP — only a daily-rotating hash.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (isBot(userAgent)) return NextResponse.json({ ok: true, ignored: true });

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "local";

  if (await limitIp("events", 600, 60, ip)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const json: unknown = await request.json().catch(() => null);
  const parsed = trackBatchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const inputs = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
  const events: AnalyticsEvent[] = await Promise.all(
    inputs.map((input) => resolvePageProduct(buildEvent(input, { userAgent, ip }))),
  );
  try {
    const result = await recordEvents(events);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const requestId = crypto.randomUUID().slice(0, 8);
    logger.error("track.ingest_failed", { requestId, message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ ok: false, requestId }, { status: 500 });
  }
}

/** Minimal GET for uptime checks — reports the daily hash salt date only. */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true, salt: hashIpDaily("health").slice(0, 4) });
}
