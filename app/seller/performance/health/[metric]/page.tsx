import Link from "next/link";
import { notFound } from "next/navigation";

import { formatINR } from "@/lib/money";
import {
  accountHealth,
  metricDrillOrders,
  type HealthMetricKey,
} from "@/lib/hub/reports/health";
import {
  getSettings,
  listMessagesForReport,
  listOrders,
  listReturnsForReport,
  listReviewsForReport,
  listThreads,
} from "@/lib/store/engine";

export const metadata = { title: "Health metric · Seller Hub" };
export const dynamic = "force-dynamic";

const KEYS: HealthMetricKey[] = [
  "order_defect_rate",
  "late_shipment_rate",
  "pre_fulfilment_cancellation_rate",
  "valid_tracking_rate",
  "return_rate",
  "message_response_time",
];

export default async function HealthMetricPage({
  params,
}: {
  params: Promise<{ metric: string }>;
}) {
  const { metric: key } = await params;
  if (!KEYS.includes(key as HealthMetricKey)) notFound();

  const [orders, returns, reviews, threads, messages, settings] = await Promise.all([
    listOrders(),
    listReturnsForReport(),
    listReviewsForReport(),
    listThreads(),
    listMessagesForReport(),
    getSettings(),
  ]);
  const metrics = accountHealth({
    orders,
    returns,
    reviews,
    threads,
    messages,
    shipByDays: settings.shipByDays,
  });
  const metric = metrics.find((row) => row.key === key);
  if (!metric) notFound();
  const drilled = metricDrillOrders(metric, orders);

  return (
    <div>
      <p className="font-mono text-hub-label uppercase text-muted">
        <Link href="/seller/performance/health" className="hover:text-ink">
          Account health
        </Link>{" "}
        / {metric.label}
      </p>
      <h1 className="mt-2 text-hub-title font-display">{metric.label}</h1>
      <p className="mt-1 text-hub-body text-muted">
        {metric.numerator} of {metric.denominator} over {metric.windowDays} days ·{" "}
        {metric.key === "message_response_time"
          ? `median ${metric.valueHours ?? 0} hours`
          : `${((metric.valueBps ?? 0) / 100).toFixed(2)}%`}
      </p>

      <section className="mt-6 rounded-hub border border-hairline bg-paper">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-hub-table">
            <thead>
              <tr className="border-b border-hairline bg-linen text-left font-mono text-hub-label uppercase text-muted">
                <th className="px-4 py-2.5 font-medium">Order</th>
                <th className="px-4 py-2.5 font-medium">Placed (IST)</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Units</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
                <th className="px-4 py-2.5 font-medium">Shipped (IST)</th>
                <th className="px-4 py-2.5 font-medium">Tracking</th>
              </tr>
            </thead>
            <tbody>
              {drilled.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted">
                    No orders in this metric right now — that is the healthy state.
                  </td>
                </tr>
              ) : (
                drilled.map((order) => (
                  <tr key={order.id} className="border-b border-hairline last:border-0 hover:bg-linen/50">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/orders/${order.number}`} className="font-mono text-hub-id text-red-ink">
                        {order.number}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-hub-id text-muted">
                      {order.createdAt.slice(0, 10)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-hub-label uppercase">{order.status}</td>
                    <td className="px-4 py-2.5 text-right tabular">
                      {order.items.reduce((sum, item) => sum + item.qty, 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular">{formatINR(order.totalPaise)}</td>
                    <td className="px-4 py-2.5 font-mono text-hub-id text-muted">
                      {order.shippedAt ? order.shippedAt.slice(0, 10) : "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-hub-id text-muted">
                      {order.trackingNumber ?? "—"}
                    </td>
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
