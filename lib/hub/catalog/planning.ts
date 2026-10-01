import type { Order } from "@/lib/commerce/types";

export type StockPlan = { sold7: number; sold30: number; sold90: number; velocity: number; daysCover: number | null; reorderQty: number; status: "Restock now" | "Restock soon" | "Healthy" | "Overstocked" };
export type SaleBuckets = { sold7: number; sold30: number; sold90: number; lastSoldAt: string | null };
const paid = new Set(["paid", "cod_confirmed", "packed", "shipped", "delivered", "return_requested", "returned"]);

/** O(order items), not O(variants × orders); shared by large catalogue views. */
export function saleBuckets(orders: Order[], now: Date): Map<string, SaleBuckets> {
  const buckets = new Map<string, SaleBuckets>();
  const end = now.getTime();
  for (const order of orders) {
    if (!paid.has(order.status)) continue;
    const at = order.paidAt ?? order.createdAt;
    const elapsed = end - new Date(at).getTime();
    if (elapsed < 0) continue;
    for (const item of order.items) {
      const current = buckets.get(item.variantId) ?? { sold7: 0, sold30: 0, sold90: 0, lastSoldAt: null };
      if (elapsed <= 7 * 86400000) current.sold7 += item.qty;
      if (elapsed <= 30 * 86400000) current.sold30 += item.qty;
      if (elapsed <= 90 * 86400000) current.sold90 += item.qty;
      if (!current.lastSoldAt || at > current.lastSoldAt) current.lastSoldAt = at;
      buckets.set(item.variantId, current);
    }
  }
  return buckets;
}

export function stockPlanFromBuckets(available: number, buckets: SaleBuckets | undefined, leadDays = 10, targetDays = 30): StockPlan {
  const sold7 = buckets?.sold7 ?? 0;
  const sold30 = buckets?.sold30 ?? 0;
  const sold90 = buckets?.sold90 ?? 0;
  const velocity = sold30 / 30;
  const daysCover = velocity ? available / velocity : null;
  const reorderQty = Math.max(0, Math.ceil(velocity * (leadDays + targetDays) - available));
  const status = available <= 0 || (daysCover !== null && daysCover < leadDays) ? "Restock now"
    : daysCover !== null && daysCover < leadDays + 7 ? "Restock soon"
    : daysCover === null || daysCover > 120 ? "Overstocked" : "Healthy";
  return { sold7, sold30, sold90, velocity, daysCover, reorderQty, status };
}

export function stockPlan(variantId: string, available: number, orders: Order[], now: Date, leadDays = 10, targetDays = 30): StockPlan {
  return stockPlanFromBuckets(available, saleBuckets(orders, now).get(variantId), leadDays, targetDays);
}
