/**
 * First-party traffic ingest (S10) — privacy-respecting by design:
 * - No IP is ever stored. ipHash = HMAC(daily-rotating salt, ip) exists only
 *   for dedupe and rate limiting and expires from the salt's usefulness
 *   after a day.
 * - Session ids live in a first-party cookie the beacon owns.
 * - Bot user agents are dropped silently.
 */

import { createHmac } from "node:crypto";

import { z } from "zod";

import { serverEnv } from "@/lib/env";
import type { AnalyticsEvent, AnalyticsEventType } from "@/lib/store/engine";

export const TRACK_EVENT_TYPES = ["page_view", "add_to_cart", "begin_checkout", "purchase"] as const;

const eventSchema = z.object({
  id: z.string().min(6).max(64),
  type: z.enum(TRACK_EVENT_TYPES),
  path: z.string().min(1).max(200),
  sid: z.string().min(6).max(64),
  ref: z.string().max(120).optional(),
  device: z.enum(["mobile", "tablet", "desktop"]).optional(),
  productId: z.string().max(80).optional(),
  variantId: z.string().max(80).optional(),
  orderId: z.string().max(80).optional(),
  valuePaise: z.number().int().min(0).max(100_000_000).optional(),
});

export const trackBatchSchema = z.union([eventSchema, z.array(eventSchema).max(20)]);

export type TrackInput = z.infer<typeof eventSchema>;

const BOT_UA = /bot|crawl|spider|slurp|headless|preview|monitor|curl|wget|python-requests|postman/i;

export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return BOT_UA.test(userAgent);
}

/** Daily-rotating salt: same IP hashes differently tomorrow. */
export function hashIpDaily(ip: string, now: Date = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  const salt = createHmac("sha256", serverEnv.SUPABASE_SERVICE_ROLE_KEY).update(`track:${day}`).digest("hex");
  return createHmac("sha256", salt).update(ip).digest("hex").slice(0, 20);
}

export function classifyDevice(userAgent: string): "mobile" | "tablet" | "desktop" {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) return "tablet";
  if (/mobi|android|iphone|ipod/.test(ua)) return "mobile";
  return "desktop";
}

function referrerHost(ref: string | undefined): string | null {
  if (!ref) return null;
  try {
    return new URL(ref).host.slice(0, 120) || null;
  } catch {
    return ref.slice(0, 120) || null;
  }
}

export function buildEvent(input: TrackInput, context: { userAgent: string; ip: string; now?: Date }): AnalyticsEvent {
  const now = context.now ?? new Date();
  return {
    id: input.id,
    type: input.type as AnalyticsEventType,
    at: now.toISOString(),
    sessionId: input.sid,
    path: input.path.slice(0, 200),
    productId: input.productId ?? input.variantId ?? null,
    referrerHost: referrerHost(input.ref),
    device: input.device ?? classifyDevice(context.userAgent),
    ipHash: hashIpDaily(context.ip, now),
    orderId: input.orderId ?? null,
    valuePaise: input.valuePaise ?? 0,
    month: now.toISOString().slice(0, 7),
  };
}
