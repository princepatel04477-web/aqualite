import { describe, expect, it } from "vitest";

import type { Order } from "@/lib/commerce/types";
import { istDay, openOrderMetrics, salesMetrics, topProductMetrics } from "@/lib/hub/metrics";

function order(id: string, instant: string, status: Order["status"] = "paid", qty = 2, unit = 10000): Order {
  return {
    id, number: id, createdAt: instant, paidAt: instant, status,
    items: [{ id, variantId: "v", productSlug: "shoe", productName: "Shoe", image: "", colorwayName: "Red", sku: "R-1", sizeUk: 8, qty, unitPricePaise: unit, lineTotalPaise: qty * unit, taxPaise: 0, taxRateBps: 0 }],
  } as Order;
}

describe("Seller Hub metrics", () => {
  it("groups at IST midnight, not UTC midnight, and compares equal length periods", () => {
    const orders = [
      order("previous", "2026-09-28T18:29:59Z", "paid", 1, 5000),
      order("today", "2026-09-28T18:30:00Z", "paid", 2, 12000),
      order("excluded", "2026-09-29T04:00:00Z", "cancelled", 9),
    ];
    const result = salesMetrics(orders, new Date("2026-09-29T12:00:00Z"));
    expect(istDay("2026-09-28T18:30:00Z") - istDay("2026-09-28T18:29:59Z")).toBe(1);
    expect(result.periods[0]!.current).toEqual({ revenuePaise: 24000, units: 2, orders: 1, aovPaise: 24000 });
    expect(result.periods[0]!.previous.revenuePaise).toBe(5000);
    expect(result.periods[1]!.current.revenuePaise).toBe(29000);
    expect(result.daily.at(-1)).toBe(24000);
    expect(topProductMetrics(orders, new Date("2026-09-29T12:00:00Z"))[0]?.units).toBe(3);
  });
  it("excludes unpaid from ordered sales and counts open orders accurately", () => {
    const orders = [order("a", "2026-09-29T05:00:00Z", "pending_payment"), order("b", "2026-09-29T05:00:00Z", "cod_confirmed")];
    expect(salesMetrics(orders, new Date("2026-09-29T12:00:00Z")).periods[0]!.current.orders).toBe(1);
    expect(openOrderMetrics(orders, new Date("2026-09-29T12:00:00Z")).map((row) => row.count)).toEqual([1, 1, null, null, 1]);
  });
});
