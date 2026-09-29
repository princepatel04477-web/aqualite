/**
 * Sales & traffic by product/SKU: PDP sessions, unit session %, units,
 * sales, returns % and refunds.
 */

import type { Order } from "@/lib/commerce/types";
import type { AnalyticsEvent } from "@/lib/store/engine";
import { bps, isLiveOrder, itemNet } from "@/lib/hub/reports/orders";
import { inRange, type DateRange } from "@/lib/hub/reports/range";

export type ProductRow = {
  productId: string;
  productName: string;
  sku: string;
  sessions: number;
  unitSessionBps: number;
  units: number;
  salesPaise: number;
  returnRateBps: number;
  refundsPaise: number;
};

export type ReturnRow = {
  id: string;
  orderId: string;
  orderItemId: string;
  reason: string;
  resolution: string;
  status: string;
  createdAt: string;
};

export type ProductReportInput = {
  orders: Order[];
  events: AnalyticsEvent[];
  returns: ReturnRow[];
  range: DateRange;
};

export function productsReport(input: ProductReportInput): ProductRow[] {
  const sessionsByProduct = new Map<string, Set<string>>();
  for (const event of input.events) {
    if (event.type !== "page_view" || !event.productId) continue;
    if (!inRange(event.at, input.range)) continue;
    const set = sessionsByProduct.get(event.productId) ?? new Set<string>();
    set.add(event.sessionId);
    sessionsByProduct.set(event.productId, set);
  }

  const rows = new Map<string, ProductRow>();
  const ensure = (item: Order["items"][number]): ProductRow => {
    const key = item.productId || item.variantId;
    const existing = rows.get(key);
    if (existing) return existing;
    const row: ProductRow = {
      productId: key,
      productName: item.productName,
      sku: item.sku,
      sessions: 0,
      unitSessionBps: 0,
      units: 0,
      salesPaise: 0,
      returnRateBps: 0,
      refundsPaise: 0,
    };
    rows.set(key, row);
    return row;
  };

  let returnedByProduct = new Map<string, number>();
  for (const order of input.orders) {
    if (!isLiveOrder(order) || !inRange(order.createdAt, input.range)) continue;
    for (const item of order.items) {
      const row = ensure(item);
      row.units += item.qty;
      row.salesPaise += itemNet(item);
    }
  }

  // Returns and refunds inside the window, attributed to their line.
  returnedByProduct = new Map<string, number>();
  for (const row of input.returns) {
    if (!inRange(row.createdAt, input.range)) continue;
    const order = input.orders.find((item) => item.id === row.orderId);
    const item = order?.items.find((line) => line.id === row.orderItemId);
    if (!order || !item) continue;
    const key = item.productId || item.variantId;
    const target = ensure(item);
    if (row.status !== "rejected") {
      returnedByProduct.set(key, (returnedByProduct.get(key) ?? 0) + 1);
    }
    if (row.resolution === "refund" || order.status === "refunded") {
      target.refundsPaise += itemNet(item);
    }
  }

  return [...rows.values()]
    .map((row) => {
      const sessions = sessionsByProduct.get(row.productId)?.size ?? 0;
      return {
        ...row,
        sessions,
        unitSessionBps: bps(row.units, sessions),
        returnRateBps: bps(returnedByProduct.get(row.productId) ?? 0, row.units || 1),
      };
    })
    .sort((a, b) => b.salesPaise - a.salesPaise);
}

export function productsCsv(rows: ProductRow[]): string {
  const header = "product_id,product_name,sku,sessions,unit_session_bps,units,sales_paise,return_rate_bps,refunds_paise";
  const body = rows
    .map((row) =>
      [
        row.productId,
        JSON.stringify(row.productName),
        row.sku,
        row.sessions,
        row.unitSessionBps,
        row.units,
        row.salesPaise,
        row.returnRateBps,
        row.refundsPaise,
      ].join(","),
    )
    .join("\n");
  return `${header}\n${body}\n`;
}
