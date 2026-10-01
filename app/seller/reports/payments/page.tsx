import Link from "next/link";

import { StatCard } from "@/components/seller/ChartBlock";
import { SettlementSyncButton } from "@/components/seller/SettlementSyncButton";
import { formatINR } from "@/lib/money";
import { codPeriods, reconcile, feeFor } from "@/lib/hub/reports/settlements";
import {
  listCapturedPayments,
  listCodCollections,
  listNotifications,
  listOrders,
  listSettlementItems,
  listSettlements,
} from "@/lib/store/engine";
import { dayLabel } from "@/lib/hub/reports/view";

export const metadata = { title: "Payments · Seller Hub" };
export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;

type View = "summary" | "transactions" | "statement";

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Search> | Search;
}) {
  const params = await Promise.resolve(searchParams);
  const view = (["summary", "transactions", "statement"].find((v) => v === one(params.view)) ??
    "summary") as View;
  const settlementId = one(params.settlement);

  const [settlements, items, payments, orders, marks, notifications] = await Promise.all([
    listSettlements(),
    listSettlementItems(),
    listCapturedPayments(),
    listOrders(),
    listCodCollections(),
    listNotifications(),
  ]);

  const recon = reconcile(settlements, items, payments, orders);
  const openMismatches = notifications.filter(
    (row) => row.kind === "settlement_mismatch" && row.readAt === null,
  );
  const cod = codPeriods(orders, marks);
  const settledNet = settlements.reduce((sum, row) => sum + row.netPaise, 0);
  const capturedTotal = payments
    .filter((row) => row.status === "captured")
    .reduce((sum, row) => sum + row.amountPaise, 0);
  const selected = settlements.find((row) => row.id === settlementId) ?? settlements[0];
  const selectedItems = selected ? items.filter((row) => row.settlementId === selected.id) : [];
  const orderById = new Map(orders.map((order) => [order.id, order]));

  const views: { id: View; label: string }[] = [
    { id: "summary", label: "Summary" },
    { id: "transactions", label: "Transactions" },
    { id: "statement", label: "Statement" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-hub-title font-display">Payments</h1>
          <p className="mt-1 text-hub-body text-muted">
            Razorpay settlements, reconciliation and COD collections. Fee model: 2% + 18% GST on the
            fee.
          </p>
        </div>
        <SettlementSyncButton />
      </div>

      {openMismatches.length > 0 ? (
        <div className="mt-4 rounded-hub border border-danger/40 bg-danger-tint p-4 text-hub-body">
          <p className="font-semibold text-danger">
            {openMismatches.length} settlement mismatch{openMismatches.length > 1 ? "es" : ""} need
            attention
          </p>
          <ul className="mt-2 space-y-1 text-ink">
            {openMismatches.slice(0, 3).map((row) => (
              <li key={row.id}>· {row.title}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Captured (all time)" value={formatINR(capturedTotal)} sub={`${payments.length} payments`} />
        <StatCard
          label="Settled net"
          value={formatINR(settledNet)}
          sub={`${settlements.length} settlements`}
          accent="success"
        />
        <StatCard
          label="Unsettled"
          value={String(recon.unsettled.length)}
          sub={recon.unsettled.length ? formatINR(recon.unsettled.reduce((s, p) => s + p.amountPaise, 0)) : "nothing pending"}
          accent={recon.unsettled.length ? "danger" : "ink"}
        />
        <StatCard
          label="Matched lines"
          value={`${recon.matched.length}/${items.length || recon.matched.length}`}
          sub="store payments vs settlement items"
          accent="aqua"
        />
      </div>

      <nav className="mt-6 flex gap-1 border-b border-hairline" aria-label="Payment views">
        {views.map((item) => (
          <Link
            key={item.id}
            href={`/seller/reports/payments?view=${item.id}${selected ? `&settlement=${selected.id}` : ""}`}
            className={`-mb-px border-b-2 px-4 py-2 font-mono text-hub-label uppercase transition-colors duration-quick ${
              item.id === view
                ? "border-red text-red-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {view === "summary" ? (
        <section className="mt-6 rounded-hub border border-hairline bg-paper">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-hub-table">
              <thead>
                <tr className="border-b border-hairline bg-linen text-left font-mono text-hub-label uppercase text-muted">
                  <th className="px-4 py-2.5 font-medium">Settled on (IST)</th>
                  <th className="px-4 py-2.5 font-medium">UTR</th>
                  <th className="px-4 py-2.5 text-right font-medium">Gross</th>
                  <th className="px-4 py-2.5 text-right font-medium">Fee</th>
                  <th className="px-4 py-2.5 text-right font-medium">GST on fee</th>
                  <th className="px-4 py-2.5 text-right font-medium">Net</th>
                  <th className="px-4 py-2.5 text-right font-medium">Lines</th>
                </tr>
              </thead>
              <tbody>
                {settlements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted">
                      No settlements yet — the nightly sync (or the button above) pulls them in.
                    </td>
                  </tr>
                ) : (
                  settlements.map((row) => (
                    <tr key={row.id} className="border-b border-hairline last:border-0 hover:bg-linen/50">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/seller/reports/payments?view=statement&settlement=${row.id}`}
                          className="font-medium text-red-ink"
                        >
                          {dayLabel(row.settledOn)}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-hub-id">{row.utr}</td>
                      <td className="px-4 py-2.5 text-right tabular">{formatINR(row.grossPaise)}</td>
                      <td className="px-4 py-2.5 text-right tabular">{formatINR(row.feePaise)}</td>
                      <td className="px-4 py-2.5 text-right tabular">{formatINR(row.gstOnFeePaise)}</td>
                      <td className="px-4 py-2.5 text-right tabular font-medium">{formatINR(row.netPaise)}</td>
                      <td className="px-4 py-2.5 text-right tabular">
                        {items.filter((item) => item.settlementId === row.id).length}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {view === "transactions" ? (
        <section className="mt-6 rounded-hub border border-hairline bg-paper">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-hub-table">
              <thead>
                <tr className="border-b border-hairline bg-linen text-left font-mono text-hub-label uppercase text-muted">
                  <th className="px-4 py-2.5 font-medium">Payment</th>
                  <th className="px-4 py-2.5 font-medium">Order</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-4 py-2.5 text-right font-medium">Expected fee</th>
                  <th className="px-4 py-2.5 text-right font-medium">Settled</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((row) => {
                  const settled = items.some(
                    (item) => item.paymentId === (row.providerPaymentId ?? row.id),
                  );
                  const cut = feeFor(row.amountPaise);
                  return (
                    <tr key={row.id} className="border-b border-hairline last:border-0 hover:bg-linen/50">
                      <td className="px-4 py-2.5 font-mono text-hub-id">{row.providerPaymentId ?? row.id}</td>
                      <td className="px-4 py-2.5">
                        <Link href={`/seller/orders/${orderById.get(row.orderId)?.number ?? ""}`} className="text-red-ink">
                          {orderById.get(row.orderId)?.number ?? row.orderId}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-hub-label uppercase text-muted">{row.status}</td>
                      <td className="px-4 py-2.5 text-right tabular">{formatINR(row.amountPaise)}</td>
                      <td className="px-4 py-2.5 text-right tabular text-muted">{formatINR(cut.feePaise + cut.gstOnFeePaise)}</td>
                      <td className="px-4 py-2.5 text-right">
                        {settled ? (
                          <span className="text-success">settled</span>
                        ) : (
                          <span className="text-warning">pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {view === "statement" && selected ? (
        <section className="mt-6 rounded-hub border border-hairline bg-paper p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="text-hub-section font-semibold">
                Statement · {dayLabel(selected.settledOn)}
              </h2>
              <p className="mt-1 font-mono text-hub-id text-muted">UTR {selected.utr}</p>
            </div>
            <Link
              href={`/api/seller/reports/payments?settlement=${selected.id}&kind=statement`}
              className="rounded-control border border-rule bg-paper px-3 py-2 font-mono text-hub-label uppercase transition-colors duration-quick hover:bg-linen"
            >
              Statement CSV
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-hub-table">
              <thead>
                <tr className="border-b border-hairline text-left font-mono text-hub-label uppercase text-muted">
                  <th className="py-2.5 pr-4 font-medium">Payment</th>
                  <th className="py-2.5 pr-4 font-medium">Order</th>
                  <th className="py-2.5 pr-4 text-right font-medium">Gross</th>
                  <th className="py-2.5 pr-4 text-right font-medium">Fee</th>
                  <th className="py-2.5 pr-4 text-right font-medium">GST</th>
                  <th className="py-2.5 text-right font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.map((item) => (
                  <tr key={item.id} className="border-b border-hairline last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-hub-id">{item.paymentId}</td>
                    <td className="py-2.5 pr-4">
                      {orderById.get(item.orderId ?? "")?.number ?? item.orderId ?? "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular">{formatINR(item.amountPaise)}</td>
                    <td className="py-2.5 pr-4 text-right tabular">{formatINR(item.feePaise)}</td>
                    <td className="py-2.5 pr-4 text-right tabular">{formatINR(item.gstOnFeePaise)}</td>
                    <td className="py-2.5 text-right tabular">{formatINR(item.netPaise)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-rule font-medium">
                  <td className="py-2.5 pr-4">Total</td>
                  <td />
                  <td className="py-2.5 pr-4 text-right tabular">{formatINR(selected.grossPaise)}</td>
                  <td className="py-2.5 pr-4 text-right tabular">{formatINR(selected.feePaise)}</td>
                  <td className="py-2.5 pr-4 text-right tabular">{formatINR(selected.gstOnFeePaise)}</td>
                  <td className="py-2.5 text-right tabular">{formatINR(selected.netPaise)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="mt-8 rounded-hub border border-hairline bg-paper p-5">
        <h2 className="text-hub-section font-semibold">COD to collect</h2>
        <p className="mt-1 text-hub-body text-muted">
          Cash-on-delivery totals per IST day, marked collected when the courier remits.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-hub-table">
            <thead>
              <tr className="border-b border-hairline text-left font-mono text-hub-label uppercase text-muted">
                <th className="py-2.5 pr-4 font-medium">Day (IST)</th>
                <th className="py-2.5 pr-4 text-right font-medium">Orders</th>
                <th className="py-2.5 pr-4 text-right font-medium">Amount</th>
                <th className="py-2.5 pr-4 font-medium">Status</th>
                <th className="py-2.5 font-medium">Courier note</th>
              </tr>
            </thead>
            <tbody>
              {cod.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">
                    No COD orders yet.
                  </td>
                </tr>
              ) : (
                cod.map((period) => (
                  <tr key={period.periodStart} className="border-b border-hairline last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-hub-id">{dayLabel(period.periodStart)}</td>
                    <td className="py-2.5 pr-4 text-right tabular">{period.orders}</td>
                    <td className="py-2.5 pr-4 text-right tabular">{formatINR(period.amountPaise)}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`font-mono text-hub-label uppercase ${
                          period.status === "collected" ? "text-success" : "text-warning"
                        }`}
                      >
                        {period.status === "collected" ? "Collected" : "To collect"}
                      </span>
                    </td>
                    <td className="py-2.5 text-muted">{period.courierNote || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
