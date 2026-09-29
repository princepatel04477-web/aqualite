/**
 * Conversion funnel over distinct sessions:
 * sessions → PDP views → add to cart → begin checkout → purchase.
 */

import type { AnalyticsEvent } from "@/lib/store/engine";
import { bps } from "@/lib/hub/reports/orders";
import { inRange, type DateRange } from "@/lib/hub/reports/range";

export type FunnelStep = {
  key: "sessions" | "pdp" | "add_to_cart" | "begin_checkout" | "purchase";
  label: string;
  sessions: number;
  /** Share of the first step, in basis points. */
  ofTopBps: number;
  /** Conversion from the previous step, in basis points. */
  stepBps: number;
};

export function funnelReport(events: AnalyticsEvent[], range: DateRange): FunnelStep[] {
  const buckets: Record<FunnelStep["key"], Set<string>> = {
    sessions: new Set(),
    pdp: new Set(),
    add_to_cart: new Set(),
    begin_checkout: new Set(),
    purchase: new Set(),
  };
  for (const event of events) {
    if (!inRange(event.at, range)) continue;
    if (event.type === "page_view") {
      buckets.sessions.add(event.sessionId);
      if (event.productId) buckets.pdp.add(event.sessionId);
    } else if (event.type === "add_to_cart") {
      buckets.add_to_cart.add(event.sessionId);
    } else if (event.type === "begin_checkout") {
      buckets.begin_checkout.add(event.sessionId);
    } else {
      buckets.purchase.add(event.sessionId);
    }
  }
  const order: FunnelStep["key"][] = ["sessions", "pdp", "add_to_cart", "begin_checkout", "purchase"];
  const labels: Record<FunnelStep["key"], string> = {
    sessions: "Sessions",
    pdp: "Product views",
    add_to_cart: "Added to bag",
    begin_checkout: "Checkout started",
    purchase: "Purchased",
  };
  const top = buckets.sessions.size;
  return order.map((key, index) => {
    const sessions = buckets[key].size;
    const previous = index === 0 ? sessions : buckets[order[index - 1] as FunnelStep["key"]].size;
    return {
      key,
      label: labels[key],
      sessions,
      ofTopBps: bps(sessions, top),
      stepBps: index === 0 ? 10000 : bps(sessions, previous),
    };
  });
}
