/**
 * Promotion rows and performance maths for the Seller Hub.
 * Pure over engine data — no IO here.
 */

import type { Order } from "@/lib/commerce/types";
import {
  promotionStatus,
  type Promotion,
  type PromotionStatus,
} from "@/lib/pricing/promotions";
import type { PromotionRedemption } from "@/lib/store/engine";

export type PromotionRow = {
  id: string;
  kind: "coupon" | "automatic";
  code: string | null;
  name: string;
  status: PromotionStatus;
  discountLabel: string;
  startsAt: string;
  endsAt: string | null;
  redemptions: number;
  discountGivenPaise: number;
  revenuePaise: number;
};

export type PromotionPerformance = {
  promotionId: string;
  orders: number;
  units: number;
  discountSpentPaise: number;
  revenuePaise: number;
  promoAovPaise: number;
  nonPromoAovPaise: number;
  nonPromoOrders: number;
};

export function discountLabel(promotion: Promotion): string {
  if (promotion.discountType === "free_shipping") return "Free shipping";
  if (promotion.discountType === "percent") {
    const value = promotion.value / 100;
    const text = Number.isInteger(value) ? String(value) : String(value);
    return `${text}% off`;
  }
  return `₹${Math.round(promotion.value / 100)} off`;
}

export function promotionRow(
  promotion: Promotion,
  redemptions: PromotionRedemption[],
  orders: Order[],
  now: Date = new Date(),
): PromotionRow {
  const rows = redemptions.filter((row) => row.promotionId === promotion.id && row.releasedAt === null);
  const orderIds = new Set(rows.map((row) => row.orderId));
  const attributed = orders.filter((order) => orderIds.has(order.id));
  return {
    id: promotion.id,
    kind: promotion.kind,
    code: promotion.code,
    name: promotion.name,
    status: promotionStatus(promotion, now),
    discountLabel: discountLabel(promotion),
    startsAt: promotion.startsAt,
    endsAt: promotion.endsAt,
    redemptions: rows.length,
    discountGivenPaise: rows.reduce((sum, row) => sum + row.discountPaise, 0),
    revenuePaise: attributed.reduce((sum, order) => sum + order.totalPaise, 0),
  };
}

/** Orders, units, discount spent and AOV vs non-promo AOV over the promo window. */
export function promotionPerformance(
  promotion: Promotion,
  redemptions: PromotionRedemption[],
  orders: Order[],
): PromotionPerformance {
  const rows = redemptions.filter((row) => row.promotionId === promotion.id && row.releasedAt === null);
  const orderIds = new Set(rows.map((row) => row.orderId));
  const live = (order: Order) => !["cancelled", "payment_failed"].includes(order.status);
  const promoOrders = orders.filter((order) => orderIds.has(order.id) && live(order));
  const windowStart = new Date(promotion.startsAt).getTime();
  const windowEnd = promotion.endsAt ? new Date(promotion.endsAt).getTime() : Number.POSITIVE_INFINITY;
  const others = orders.filter((order) => {
    if (orderIds.has(order.id) || !live(order)) return false;
    const at = new Date(order.createdAt).getTime();
    return at >= windowStart && at <= windowEnd;
  });
  const revenuePaise = promoOrders.reduce((sum, order) => sum + order.totalPaise, 0);
  const otherRevenue = others.reduce((sum, order) => sum + order.totalPaise, 0);
  return {
    promotionId: promotion.id,
    orders: promoOrders.length,
    units: promoOrders.reduce((sum, order) => sum + order.items.reduce((n, item) => n + item.qty, 0), 0),
    discountSpentPaise: rows.reduce((sum, row) => sum + row.discountPaise, 0),
    revenuePaise,
    promoAovPaise: promoOrders.length ? Math.round(revenuePaise / promoOrders.length) : 0,
    nonPromoAovPaise: others.length ? Math.round(otherRevenue / others.length) : 0,
    nonPromoOrders: others.length,
  };
}
