/**
 * Account health (S10) — rolling windows with editable targets.
 *
 * - Order defect rate (60d): orders touched by a ≤2★ verified review, a
 *   return for "defective / different from photos", or a refund dispute.
 * - Late shipment rate (30d): shipped after ship-by (created + shipByDays).
 * - Pre-fulfilment cancellation rate (7d): seller-cancelled before ship.
 * - Valid tracking rate (30d): shipped with a tracking number.
 * - Return rate (30d): returned units ÷ units sold.
 * - Buyer message response time: median hours from an incoming message to the
 *   seller's reply (open ones age until answered).
 */

import type { Order } from "@/lib/commerce/types";
import type { MessageRecord, MessageThread, StoredReview } from "@/lib/store/engine";
import { istDayAdd, istDayOf } from "@/lib/time/ist";

export type HealthMetricKey =
  | "order_defect_rate"
  | "late_shipment_rate"
  | "pre_fulfilment_cancellation_rate"
  | "valid_tracking_rate"
  | "return_rate"
  | "message_response_time";

export type HealthMetric = {
  key: HealthMetricKey;
  label: string;
  windowDays: number;
  valueBps: number | null;
  valueHours: number | null;
  targetBps: number | null;
  targetHours: number | null;
  direction: "lower_is_better" | "higher_is_better";
  status: "good" | "watch" | "breach";
  numerator: number;
  denominator: number;
  orderIds: string[];
  trend: number[];
};

export type HealthReturnRow = {
  id: string;
  orderId: string;
  orderItemId: string;
  reason: string;
  resolution: string;
  status: string;
  createdAt: string;
};

export type HealthInput = {
  orders: Order[];
  returns: HealthReturnRow[];
  reviews: StoredReview[];
  threads: MessageThread[];
  messages: MessageRecord[];
  /** Days after which an unshipped order counts as late (settings.shipByDays). */
  shipByDays: number;
  now?: Date;
};

export const DEFAULT_TARGETS: Record<HealthMetricKey, { targetBps: number | null; targetHours: number | null }> = {
  order_defect_rate: { targetBps: 100, targetHours: null }, // < 1%
  late_shipment_rate: { targetBps: 400, targetHours: null }, // < 4%
  pre_fulfilment_cancellation_rate: { targetBps: 250, targetHours: null }, // < 2.5%
  valid_tracking_rate: { targetBps: 9500, targetHours: null }, // > 95%
  return_rate: { targetBps: 500, targetHours: null }, // < 5%
  message_response_time: { targetBps: null, targetHours: 24 },
};

const DEFECT_REASON = /defect|different|photo|damage|broken|faulty/i;

function shippedAtOf(order: Order): string | null {
  return order.shippedAt;
}

function withinDays(iso: string | null | undefined, days: number, now: Date): boolean {
  if (!iso) return false;
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return new Date(iso).getTime() >= cutoff;
}

function statusFor(
  value: number,
  target: number,
  direction: "lower_is_better" | "higher_is_better",
): "good" | "watch" | "breach" {
  if (direction === "lower_is_better") {
    if (value < target) return "good";
    if (value < target * 2) return "watch";
    return "breach";
  }
  if (value >= target) return "good";
  if (value >= target * 0.95) return "watch";
  return "breach";
}

function trendBuckets(
  windowDays: number,
  now: Date,
  sample: (fromIso: string, toIso: string) => number,
): number[] {
  const buckets = Math.min(6, Math.max(2, Math.floor(windowDays / 7)));
  const bucketDays = Math.max(1, Math.floor(windowDays / buckets));
  const values: number[] = [];
  for (let index = buckets - 1; index >= 0; index -= 1) {
    const to = istDayAdd(istDayOf(now.toISOString()), -index * bucketDays);
    const from = istDayAdd(to, -(bucketDays - 1));
    values.push(sample(`${from}T00:00:00.000Z`, `${istDayAdd(to, 1)}T00:00:00.000Z`));
  }
  return values;
}

export function accountHealth(input: HealthInput): HealthMetric[] {
  const now = input.now ?? new Date();
  const { orders, returns, reviews, threads, messages } = input;

  /* ---- order defect rate (60d) ---- */
  const defectWindow = orders.filter((order) => withinDays(order.createdAt, 60, now));
  const defectOrderIds = new Set<string>();
  for (const row of returns) {
    if (!withinDays(row.createdAt, 60, now) || row.status === "rejected") continue;
    if (DEFECT_REASON.test(row.reason) || row.resolution === "refund") {
      defectOrderIds.add(row.orderId);
    }
  }
  for (const review of reviews) {
    if (review.rating > 2 || !review.userId || !withinDays(review.createdAt, 60, now)) continue;
    for (const order of defectWindow) {
      if (order.userId !== review.userId) continue;
      if (order.items.some((item) => item.productId === review.productId)) {
        defectOrderIds.add(order.id);
      }
    }
  }
  const defectNumerator = [...defectOrderIds].filter((id) => defectWindow.some((order) => order.id === id)).length;

  /* ---- late shipment rate (30d) ---- */
  const shipped = orders.filter((order) => withinDays(shippedAtOf(order), 30, now));
  const lateOrders = shipped.filter((order) => {
    const shipBy = new Date(order.createdAt).getTime() + input.shipByDays * 24 * 60 * 60 * 1000;
    return order.shippedAt !== null && new Date(order.shippedAt).getTime() > shipBy;
  });

  /* ---- pre-fulfilment cancellation rate (7d) ---- */
  const recent = orders.filter((order) => withinDays(order.createdAt, 7, now));
  const sellerCancels = recent.filter((order) =>
    order.events.some(
      (event) => event.to === "cancelled" && event.actor.startsWith("admin:") && order.shippedAt === null,
    ),
  );

  /* ---- valid tracking rate (30d) ---- */
  const tracked = shipped.filter((order) => Boolean(order.trackingNumber));

  /* ---- return rate (30d) ---- */
  const unitsSold = orders
    .filter((order) => withinDays(order.createdAt, 30, now) && !["cancelled", "payment_failed"].includes(order.status))
    .reduce((sum, order) => sum + order.items.reduce((n, item) => n + item.qty, 0), 0);
  const returnedUnits = returns
    .filter((row) => withinDays(row.createdAt, 30, now) && row.status !== "rejected")
    .reduce((count, row) => {
      const order = orders.find((item) => item.id === row.orderId);
      const item = order?.items.find((line) => line.id === row.orderItemId);
      return count + (item?.qty ?? 1);
    }, 0);

  /* ---- buyer message response time (median hours) ---- */
  const responseHours: number[] = [];
  for (const thread of threads) {
    const rows = messages
      .filter((message) => message.threadId === thread.id)
      .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
    for (const [index, message] of rows.entries()) {
      if (message.direction !== "in") continue;
      const next = rows.slice(index + 1).find((candidate) => candidate.direction === "out");
      const hours = ((next ? new Date(next.sentAt).getTime() : now.getTime()) - new Date(message.sentAt).getTime()) / 3600000;
      if (hours >= 0) responseHours.push(hours);
    }
  }
  responseHours.sort((a, b) => a - b);
  const medianHours = responseHours.length
    ? responseHours.length % 2 === 1
      ? (responseHours[(responseHours.length - 1) / 2] ?? 0)
      : ((responseHours[responseHours.length / 2 - 1] ?? 0) + (responseHours[responseHours.length / 2] ?? 0)) / 2
    : 0;

  const build = (
    key: HealthMetricKey,
    label: string,
    windowDays: number,
    numerator: number,
    denominator: number,
    orderIds: string[],
    trend: number[],
  ): HealthMetric => {
    const target = DEFAULT_TARGETS[key];
    const direction: HealthMetric["direction"] =
      key === "valid_tracking_rate" ? "higher_is_better" : "lower_is_better";
    const isRate = key !== "message_response_time";
    const valueBps = isRate ? (denominator > 0 ? Math.round((numerator * 10000) / denominator) : 0) : null;
    return {
      key,
      label,
      windowDays,
      valueBps,
      valueHours: isRate ? null : Math.round(medianHours * 10) / 10,
      targetBps: target.targetBps,
      targetHours: target.targetHours,
      direction,
      status: isRate
        ? statusFor(valueBps ?? 0, target.targetBps ?? 0, direction)
        : statusFor(medianHours, target.targetHours ?? 24, "lower_is_better"),
      numerator,
      denominator,
      orderIds,
      trend,
    };
  };

  return [
    build(
      "order_defect_rate",
      "Order defect rate",
      60,
      defectNumerator,
      defectWindow.length,
      [...defectOrderIds],
      trendBuckets(60, now, (from, to) => {
        const windowed = defectWindow.filter((order) => order.createdAt >= from && order.createdAt < to);
        return windowed.length
          ? Math.round((windowed.filter((order) => defectOrderIds.has(order.id)).length * 10000) / windowed.length)
          : 0;
      }),
    ),
    build(
      "late_shipment_rate",
      "Late shipment rate",
      30,
      lateOrders.length,
      shipped.length,
      lateOrders.map((order) => order.id),
      trendBuckets(30, now, (from, to) => {
        const windowed = shipped.filter((order) => order.createdAt >= from && order.createdAt < to);
        return windowed.length
          ? Math.round((windowed.filter((order) => lateOrders.includes(order)).length * 10000) / windowed.length)
          : 0;
      }),
    ),
    build(
      "pre_fulfilment_cancellation_rate",
      "Pre-fulfilment cancellation rate",
      7,
      sellerCancels.length,
      recent.length,
      sellerCancels.map((order) => order.id),
      trendBuckets(7, now, (from, to) => {
        const windowed = recent.filter((order) => order.createdAt >= from && order.createdAt < to);
        return windowed.length
          ? Math.round((windowed.filter((order) => sellerCancels.includes(order)).length * 10000) / windowed.length)
          : 0;
      }),
    ),
    build(
      "valid_tracking_rate",
      "Valid tracking rate",
      30,
      tracked.length,
      shipped.length,
      shipped.filter((order) => !order.trackingNumber).map((order) => order.id),
      trendBuckets(30, now, (from, to) => {
        const windowed = shipped.filter((order) => order.createdAt >= from && order.createdAt < to);
        return windowed.length
          ? Math.round((windowed.filter((order) => order.trackingNumber).length * 10000) / windowed.length)
          : 10000;
      }),
    ),
    build(
      "return_rate",
      "Return rate",
      30,
      returnedUnits,
      unitsSold,
      returns.filter((row) => row.status !== "rejected" && withinDays(row.createdAt, 30, now)).map((row) => row.orderId),
      trendBuckets(30, now, (from, to) => {
        const sold = orders
          .filter((order) => order.createdAt >= from && order.createdAt < to && !["cancelled", "payment_failed"].includes(order.status))
          .reduce((sum, order) => sum + order.items.reduce((n, item) => n + item.qty, 0), 0);
        const returned = returns
          .filter((row) => row.createdAt >= from && row.createdAt < to && row.status !== "rejected")
          .reduce((count, row) => {
            const order = orders.find((item) => item.id === row.orderId);
            const item = order?.items.find((line) => line.id === row.orderItemId);
            return count + (item?.qty ?? 1);
          }, 0);
        return sold ? Math.round((returned * 10000) / sold) : 0;
      }),
    ),
    build(
      "message_response_time",
      "Message response time (median)",
      30,
      Math.round(medianHours * 10) / 10,
      responseHours.length,
      [],
      trendBuckets(30, now, () => Math.round(medianHours * 10) / 10),
    ),
  ];
}

/** Hand-checkable breakdown used by drill-down pages and tests. */
export function metricDrillOrders(metric: HealthMetric, orders: Order[]): Order[] {
  const ids = new Set(metric.orderIds);
  return orders.filter((order) => ids.has(order.id));
}
