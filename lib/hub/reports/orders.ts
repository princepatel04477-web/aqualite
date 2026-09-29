/**
 * Shared order maths for reports. The "order-table totals" law: every report
 * that claims sales uses exactly these filters.
 */

import type { Order, OrderItem } from "@/lib/commerce/types";

/** Orders that count toward sales reports (matches the seller orders table). */
export function isLiveOrder(order: Order): boolean {
  return !["cancelled", "payment_failed"].includes(order.status);
}

export type OrderMoney = {
  grossPaise: number;
  discountPaise: number;
  netPaise: number;
  taxPaise: number;
  units: number;
};

export function itemNet(item: OrderItem): number {
  return item.lineTotalPaise - item.discountPaise;
}

export function orderMoney(order: Order): OrderMoney {
  return {
    grossPaise: order.items.reduce((sum, item) => sum + item.lineTotalPaise, 0),
    discountPaise: order.items.reduce((sum, item) => sum + item.discountPaise, 0),
    netPaise: order.items.reduce((sum, item) => sum + itemNet(item), 0),
    taxPaise: order.taxPaise,
    units: order.items.reduce((sum, item) => sum + item.qty, 0),
  };
}

/** Ordered sales for the order-table: item nets summed (excludes shipping/COD fee). */
export function salesOf(orders: Order[]): number {
  return orders.reduce((sum, order) => sum + orderMoney(order).netPaise, 0);
}

export function unitsOf(orders: Order[]): number {
  return orders.reduce((sum, order) => sum + orderMoney(order).units, 0);
}

export function bps(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator * 10000) / denominator);
}
