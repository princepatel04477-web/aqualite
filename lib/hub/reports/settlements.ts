/**
 * Settlement reconciliation maths (pure). Razorpay fee is modelled as 2% of
 * the payment with 18% GST on the fee — provisional until real settlement
 * rows arrive from the API. Every mismatch becomes a hub notification.
 */

import type { Order } from "@/lib/commerce/types";
import { istDayOf } from "@/lib/time/ist";

export type SettlementDraft = {
  id: string;
  utr: string;
  settledOn: string;
  grossPaise: number;
  feePaise: number;
  gstOnFeePaise: number;
  netPaise: number;
  status: string;
  createdAt: string;
};

export type SettlementItemDraft = {
  id: string;
  settlementId: string;
  paymentId: string;
  orderId: string | null;
  amountPaise: number;
  feePaise: number;
  gstOnFeePaise: number;
  netPaise: number;
};

export type CapturedPayment = {
  id: string;
  orderId: string;
  providerPaymentId: string | null;
  amountPaise: number;
  status: string;
  at: string;
};

export const FEE_BPS = 200; // 2%
export const GST_ON_FEE_BPS = 1800; // 18%

export function feeFor(amountPaise: number): { feePaise: number; gstOnFeePaise: number; netPaise: number } {
  const feePaise = Math.round((amountPaise * FEE_BPS) / 10000);
  const gstOnFeePaise = Math.round((feePaise * GST_ON_FEE_BPS) / 10000);
  return { feePaise, gstOnFeePaise, netPaise: amountPaise - feePaise - gstOnFeePaise };
}

function uid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Demo/test settlements: one settlement per settlement day, derived from the
 * store's own captured payments so the UI reconciles real ledger rows.
 */
export function deriveDemoSettlements(
  payments: CapturedPayment[],
  now: Date = new Date(),
): { settlements: SettlementDraft[]; items: SettlementItemDraft[] } {
  const byDay = new Map<string, CapturedPayment[]>();
  for (const payment of payments) {
    if (payment.status !== "captured") continue;
    const day = new Date(new Date(payment.at).getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const list = byDay.get(day) ?? [];
    list.push(payment);
    byDay.set(day, list);
  }
  const settlements: SettlementDraft[] = [];
  const items: SettlementItemDraft[] = [];
  for (const [day, list] of [...byDay.entries()].sort()) {
    const id = `stl_demo_${day.replaceAll("-", "")}`;
    let gross = 0;
    let fee = 0;
    let gst = 0;
    let net = 0;
    for (const payment of list) {
      const cut = feeFor(payment.amountPaise);
      gross += payment.amountPaise;
      fee += cut.feePaise;
      gst += cut.gstOnFeePaise;
      net += cut.netPaise;
      items.push({
        id: uid("sti"),
        settlementId: id,
        paymentId: payment.providerPaymentId ?? payment.id,
        orderId: payment.orderId,
        amountPaise: payment.amountPaise,
        ...cut,
      });
    }
    settlements.push({
      id,
      utr: `UTR${day.replaceAll("-", "")}${String(list.length).padStart(3, "0")}`,
      settledOn: day,
      grossPaise: gross,
      feePaise: fee,
      gstOnFeePaise: gst,
      netPaise: net,
      status: "processed",
      createdAt: now.toISOString(),
    });
  }
  return { settlements, items };
}

export type ReconMismatch = { title: string; body: string; paymentId: string };

export type ReconResult = {
  matched: SettlementItemDraft[];
  unsettled: CapturedPayment[];
  orphans: SettlementItemDraft[];
  amountMismatches: ReconMismatch[];
  mismatches: ReconMismatch[];
};

/** Reconcile each captured payment against settlement items. */
export function reconcile(
  settlements: SettlementDraft[],
  items: SettlementItemDraft[],
  payments: CapturedPayment[],
  orders: Order[],
): ReconResult {
  const orderById = new Map(orders.map((order) => [order.id, order]));

  const matched: SettlementItemDraft[] = [];
  const orphans: SettlementItemDraft[] = [];
  const amountMismatches: ReconMismatch[] = [];

  for (const item of items) {
    const payment = payments.find(
      (candidate) =>
        (candidate.providerPaymentId ?? candidate.id) === item.paymentId ||
        candidate.id === item.paymentId,
    );
    if (!payment) {
      orphans.push(item);
      amountMismatches.push({
        title: "Settlement item without a captured payment",
        body: `Settlement ${item.settlementId} lists payment ${item.paymentId} (${item.amountPaise} paise) that the store does not have.`,
        paymentId: item.paymentId,
      });
      continue;
    }
    if (payment.amountPaise !== item.amountPaise) {
      amountMismatches.push({
        title: "Settlement amount does not match the payment",
        body: `Payment ${item.paymentId}: store ${payment.amountPaise} paise vs settlement ${item.amountPaise} paise.`,
        paymentId: item.paymentId,
      });
      continue;
    }
    matched.push(item);
  }

  const settledKeys = new Set(items.map((item) => item.paymentId));
  const unsettled = payments.filter(
    (payment) => payment.status === "captured" && !settledKeys.has(payment.providerPaymentId ?? payment.id) && !settledKeys.has(payment.id),
  );
  for (const payment of unsettled) {
    const order = orderById.get(payment.orderId);
    amountMismatches.push({
      title: "Captured payment not settled",
      body: `Payment ${payment.providerPaymentId ?? payment.id} for order ${order?.number ?? payment.orderId} (${payment.amountPaise} paise) has no settlement item.`,
      paymentId: payment.providerPaymentId ?? payment.id,
    });
  }

  return {
    matched,
    unsettled,
    orphans,
    amountMismatches,
    mismatches: amountMismatches,
  };
}

export type CodPeriod = {
  periodStart: string;
  periodEnd: string;
  amountPaise: number;
  orders: number;
  status: "to_collect" | "collected";
  collectedAt: string | null;
  courierNote: string;
};

/** COD to collect / collected per IST day, using courier remittance marks. */
export function codPeriods(
  orders: Order[],
  marks: { periodStart: string; periodEnd: string; amountPaise: number; status: "to_collect" | "collected"; collectedAt: string | null; courierNote: string }[],
): CodPeriod[] {
  const byWeek = new Map<string, { amountPaise: number; orders: number }>();
  for (const order of orders) {
    if (order.paymentMethod !== "cod") continue;
    if (["cancelled", "payment_failed", "refunded"].includes(order.status)) continue;
    const day = istDayOf(order.createdAt);
    const weekStart = day;
    const entry = byWeek.get(weekStart) ?? { amountPaise: 0, orders: 0 };
    entry.amountPaise += order.totalPaise;
    entry.orders += 1;
    byWeek.set(weekStart, entry);
  }
  return [...byWeek.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, entry]) => {
      const mark = marks.find((item) => item.periodStart === day);
      return {
        periodStart: day,
        periodEnd: day,
        amountPaise: entry.amountPaise,
        orders: entry.orders,
        status: mark?.status ?? "to_collect",
        collectedAt: mark?.collectedAt ?? null,
        courierNote: mark?.courierNote ?? "",
      };
    });
}

export function settlementCsv(
  settlements: SettlementDraft[],
  items: SettlementItemDraft[],
  orders: Order[],
): string {
  const orderById = new Map(orders.map((order) => [order.id, order]));
  const lines = ["utr,settled_on,payment_id,order_number,gross_paise,fee_paise,gst_on_fee_paise,net_paise"];
  for (const item of items) {
    const settlement = settlements.find((row) => row.id === item.settlementId);
    const order = item.orderId ? orderById.get(item.orderId) : undefined;
    lines.push(
      [
        settlement?.utr ?? "",
        settlement?.settledOn ?? "",
        item.paymentId,
        order?.number ?? "",
        item.amountPaise,
        item.feePaise,
        item.gstOnFeePaise,
        item.netPaise,
      ].join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}
