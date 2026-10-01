import "server-only";

import type { CatalogProduct } from "@/content/catalog";
import type { Order } from "@/lib/commerce/types";
import { hubSnapshot } from "@/lib/store/engine";

import { WIDGET_IDS, type WidgetId } from "@/lib/hub/widget-config";
export { WIDGET_IDS };
export type { WidgetId };
export type WidgetSize = "S" | "M" | "L";
export type WidgetSetting = { id: WidgetId; visible: boolean; size: WidgetSize };
export type SellerRole = "owner" | "fulfilment" | "finance";

export function defaultLayout(role: SellerRole): WidgetSetting[] {
  const ids: WidgetId[] = role === "fulfilment"
    ? ["orders", "action", "inventory", "notifications", "sales", "products", "health", "payments"]
    : role === "finance"
      ? ["payments", "sales", "orders", "health", "action", "products", "inventory", "notifications"]
      : [...WIDGET_IDS];
  return ids.map((id) => ({ id, visible: true, size: id === "sales" ? "L" : "M" }));
}

export type SalesTotals = { revenuePaise: number; units: number; orders: number; aovPaise: number };
export type SalesPeriod = { label: string; current: SalesTotals; previous: SalesTotals };
export type SalesData = { periods: SalesPeriod[]; daily: number[] };
export type CountLink = { label: string; count: number | null; href: string; tone?: "danger" };
export type ProductRow = { id: string; name: string; image: string; units: number; revenuePaise: number };
export type NotificationRow = { id: string; label: string; detail: string; href: string; at: string };
export type WidgetData =
  | { kind: "sales"; value: SalesData; updatedAt: string }
  | { kind: "orders" | "action" | "inventory"; value: CountLink[]; updatedAt: string }
  | { kind: "health"; value: { label: string; rate: number | null; threshold: number }[]; updatedAt: string }
  | { kind: "payments"; value: { lastSettlement: string | null; nextExpected: string | null; pendingPaise: number | null }; updatedAt: string }
  | { kind: "products"; value: ProductRow[]; updatedAt: string }
  | { kind: "notifications"; value: NotificationRow[]; updatedAt: string };

/** Convert instants to an integer IST calendar day. UTC is never used to group sales. */
export function istDay(instant: string | Date): number {
  const date = instant instanceof Date ? instant : new Date(instant);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return Math.floor(Date.UTC(get("year"), get("month") - 1, get("day")) / 86400000);
}

export function orderedOrders(orders: Order[]): Order[] {
  return orders.filter((order) => ["paid", "cod_confirmed", "packed", "shipped", "delivered", "return_requested", "returned"].includes(order.status));
}

function totals(orders: Order[], from: number, to: number): SalesTotals {
  const selected = orders.filter((order) => {
    const day = istDay(order.paidAt ?? order.createdAt);
    return day >= from && day < to;
  });
  const revenuePaise = selected.reduce((sum, order) => sum + order.items.reduce((amount, item) => amount + item.lineTotalPaise, 0), 0);
  return {
    revenuePaise,
    units: selected.reduce((sum, order) => sum + order.items.reduce((amount, item) => amount + item.qty, 0), 0),
    orders: selected.length,
    aovPaise: selected.length ? Math.round(revenuePaise / selected.length) : 0,
  };
}

export function salesMetrics(orders: Order[], now: Date): SalesData {
  const day = istDay(now);
  const paid = orderedOrders(orders);
  return {
    periods: ([1, 7, 30] as const).map((days, index) => ({
      label: (["Today", "Last 7 days", "Last 30 days"] as const)[index] ?? "Period",
      current: totals(paid, day - days + 1, day + 1),
      previous: totals(paid, day - days * 2 + 1, day - days + 1),
    })),
    daily: Array.from({ length: 30 }, (_, i) => totals(paid, day - 29 + i, day - 28 + i).revenuePaise),
  };
}

export function openOrderMetrics(orders: Order[], now: Date): CountLink[] {
  const open = orders.filter((order) => ["paid", "cod_confirmed", "packed"].includes(order.status));
  const today = istDay(now);
  // shipByAt is populated by the S08 SLA migration; do not invent deadlines.
  const shipBy = (order: Order) => (order as Order & { shipByAt?: string }).shipByAt;
  const hasSla = open.every((order) => !!shipBy(order));
  return [
    { label: "Pending payment", count: orders.filter((order) => order.status === "pending_payment").length, href: "/seller/orders?filter=pending_payment" },
    { label: "Unshipped", count: open.length, href: "/seller/orders?filter=unshipped" },
    { label: "Late", count: hasSla ? open.filter((order) => shipBy(order) && new Date(shipBy(order)!).getTime() < now.getTime()).length : null, href: "/seller/orders?filter=late", tone: "danger" },
    { label: "Ship by today", count: hasSla ? open.filter((order) => shipBy(order) && istDay(shipBy(order)!) === today).length : null, href: "/seller/orders?filter=today" },
    { label: "COD to confirm", count: orders.filter((order) => order.status === "cod_confirmed").length, href: "/seller/orders?filter=cod_confirmed" },
  ];
}

export function topProductMetrics(orders: Order[], now: Date): ProductRow[] {
  const cutoff = istDay(now) - 29;
  const rows = new Map<string, ProductRow>();
  for (const order of orderedOrders(orders)) {
    if (istDay(order.paidAt ?? order.createdAt) < cutoff) continue;
    for (const item of order.items) {
      const current = rows.get(item.productSlug) ?? { id: item.productSlug, name: item.productName, image: item.image, units: 0, revenuePaise: 0 };
      current.units += item.qty;
      current.revenuePaise += item.lineTotalPaise;
      rows.set(item.productSlug, current);
    }
  }
  return [...rows.values()].sort((a, b) => b.revenuePaise - a.revenuePaise).slice(0, 5);
}

export function inventoryMetrics(products: CatalogProduct[], stock: Record<string, { onHand: number; reserved: number }>, orders: Order[], now: Date, lowStockDays = 17): CountLink[] {
  let out = 0;
  let low = 0;
  let suppressed = 0;
  const cutoff = istDay(now) - 29;
  const sold = new Map<string, number>();
  for (const order of orderedOrders(orders)) {
    if (istDay(order.paidAt ?? order.createdAt) < cutoff) continue;
    for (const item of order.items) sold.set(item.variantId, (sold.get(item.variantId) ?? 0) + item.qty);
  }
  for (const product of products.filter((row) => row.isActive)) {
    for (const colorway of product.colorways) {
      if (!colorway.images.some((image) => image.role === "primary" && image.src && image.alt.trim()) ||
        !colorway.variants.length || colorway.variants.some((variant) => !variant.pricePaise)) suppressed++;
      for (const variant of colorway.variants) {
        const available = Math.max(0, (stock[variant.id]?.onHand ?? variant.stock) - (stock[variant.id]?.reserved ?? 0));
        if (!available) out++;
        else if ((sold.get(variant.id) ?? 0) > 0 && available / ((sold.get(variant.id) ?? 0) / 30) <= lowStockDays) low++;
      }
    }
  }
  return [
    { label: "Out of stock SKUs", count: out, href: "/seller/catalog/inventory?filter=out" },
    { label: `Low stock · ≤${lowStockDays} days cover`, count: low, href: "/seller/catalog/inventory?filter=low" },
    { label: "Suppressed listings", count: suppressed, href: "/seller/catalog/inventory?filter=suppressed" },
  ];
}

export async function loadWidget(id: WidgetId, now = new Date()): Promise<WidgetData> {
  const snapshot = await hubSnapshot();
  const updatedAt = now.toISOString();
  switch (id) {
    case "sales": return { kind: id, value: salesMetrics(snapshot.orders, now), updatedAt };
    case "orders": return { kind: id, value: openOrderMetrics(snapshot.orders, now), updatedAt };
    case "action": return { kind: id, updatedAt, value: [
      { label: "Returns awaiting authorisation", count: snapshot.returns.filter((row) => row.status === "requested").length, href: "/seller/orders?filter=returns" },
      { label: "Orders needing attention", count: snapshot.orders.filter((row) => row.needsAttention).length, href: "/seller/orders?filter=attention" },
      { label: "Reviews pending moderation", count: snapshot.reviews.filter((row) => row.status === "pending").length, href: "/admin" },
      { label: "Buyer messages >24h", count: null, href: "/admin" },
    ] };
    case "inventory": return { kind: id, value: inventoryMetrics(snapshot.products, snapshot.stock, snapshot.orders, now, (snapshot.settings.leadTimeDays ?? 10) + 7), updatedAt };
    case "health": {
      const recent = snapshot.orders.filter((row) => istDay(row.createdAt) >= istDay(now) - 29);
      const cancellations = recent.filter((row) => row.status === "cancelled").length;
      return { kind: id, updatedAt, value: [
        { label: "Order defect rate", rate: null, threshold: 1 },
        { label: "Late shipment rate", rate: null, threshold: 4 },
        { label: "Cancellation rate", rate: recent.length ? cancellations / recent.length * 100 : 0, threshold: 2.5 },
      ] };
    }
    case "payments": return { kind: id, updatedAt, value: { lastSettlement: null, nextExpected: null, pendingPaise: null } };
    case "products": return { kind: id, value: topProductMetrics(snapshot.orders, now), updatedAt };
    case "notifications": {
      const events: NotificationRow[] = snapshot.orders.flatMap((order) => order.events.map((event) => ({
        id: event.id, label: `Order ${order.number} · ${event.to.replaceAll("_", " ")}`, detail: event.note,
        href: `/seller/orders/${order.number}`, at: event.at,
      })));
      events.sort((a, b) => b.at.localeCompare(a.at));
      return { kind: id, value: events.slice(0, 6), updatedAt };
    }
  }
}
