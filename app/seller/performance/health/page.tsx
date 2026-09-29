import Link from "next/link";

import { Sparkline } from "@/components/seller/charts/Sparkline";
import {
  accountHealth,
  type HealthMetric,
} from "@/lib/hub/reports/health";
import {
  getSettings,
  listHealthSnapshots,
  listMessagesForReport,
  listOrders,
  listReturnsForReport,
  listReviewsForReport,
  listThreads,
} from "@/lib/store/engine";

export const metadata = { title: "Account health · Seller Hub" };
export const dynamic = "force-dynamic";

function valueLabel(metric: HealthMetric): string {
  if (metric.key === "message_response_time") {
    return `${metric.valueHours ?? 0} h`;
  }
  return `${((metric.valueBps ?? 0) / 100).toFixed(2)}%`;
}

function targetLabel(metric: HealthMetric): string {
  if (metric.targetHours != null) return `target < ${metric.targetHours} h`;
  const percent = ((metric.targetBps ?? 0) / 100).toFixed(1);
  return metric.direction === "higher_is_better" ? `target > ${percent}%` : `target < ${percent}%`;
}

const STATUS_TONE: Record<HealthMetric["status"], string> = {
  good: "text-success",
  watch: "text-warning",
  breach: "text-danger",
};

export default async function HealthPage() {
  const [orders, returns, reviews, threads, messages, settings, snapshots] = await Promise.all([
    listOrders(),
    listReturnsForReport(),
    listReviewsForReport(),
    listThreads(),
    listMessagesForReport(),
    getSettings(),
    listHealthSnapshots(),
  ]);
  const metrics = accountHealth({
    orders,
    returns,
    reviews,
    threads,
    messages,
    shipByDays: settings.shipByDays,
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-hub-title font-display">Account health</h1>
          <p className="mt-1 text-hub-body text-muted">
            Rolling windows, recomputed on every load and snapshotted nightly. Targets are the
            published ones — drill into any metric to see the exact orders behind it.
          </p>
        </div>
        <Link
          href="/seller/reports/business"
          className="rounded-control border border-rule bg-paper px-3 py-2 font-mono text-hub-label uppercase transition-colors duration-quick hover:bg-linen"
        >
          Business reports
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <Link
            key={metric.key}
            href={`/seller/performance/health/${metric.key}`}
            className="group rounded-hub border border-hairline bg-paper p-4 transition-colors duration-quick hover:border-rule hover:bg-linen/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-hub-label uppercase text-muted">
                  {metric.label} · {metric.windowDays}d
                </p>
                <p className={`mt-1 text-hub-kpi font-display tabular ${STATUS_TONE[metric.status]}`}>
                  {valueLabel(metric)}
                </p>
                <p className="mt-1 text-hub-label text-muted">
                  {targetLabel(metric)} · {metric.numerator}/{metric.denominator}
                </p>
              </div>
              <Sparkline
                values={metric.trend}
                label={`${metric.label} trend`}
                stroke={
                  metric.status === "good"
                    ? "var(--success)"
                    : metric.status === "watch"
                      ? "var(--warning)"
                      : "var(--danger)"
                }
              />
            </div>
            <p className="mt-3 font-mono text-hub-label uppercase text-muted">
              {metric.status === "good" ? "Healthy" : metric.status === "watch" ? "Watch" : "Breach"}{" "}
              · view orders →
            </p>
          </Link>
        ))}
      </div>

      <section className="mt-8 rounded-hub border border-hairline bg-paper p-5">
        <h2 className="text-hub-section font-semibold">Nightly snapshots</h2>
        <p className="mt-1 text-hub-body text-muted">
          Recorded by the daily cron — same maths, frozen at the moment it ran.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-hub-table">
            <thead>
              <tr className="border-b border-hairline text-left font-mono text-hub-label uppercase text-muted">
                <th className="py-2.5 pr-4 font-medium">Taken (IST)</th>
                <th className="py-2.5 pr-4 text-right font-medium">ODR</th>
                <th className="py-2.5 pr-4 text-right font-medium">LSR</th>
                <th className="py-2.5 pr-4 text-right font-medium">PFC</th>
                <th className="py-2.5 pr-4 text-right font-medium">VTR</th>
                <th className="py-2.5 text-right font-medium">Response</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted">
                    No snapshots yet — the nightly cron records the first one.
                  </td>
                </tr>
              ) : (
                snapshots.slice(0, 30).map((snapshot) => (
                  <tr key={snapshot.id} className="border-b border-hairline last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-hub-id">{snapshot.computedAt.slice(0, 16).replace("T", " ")}</td>
                    <td className="py-2.5 pr-4 text-right tabular">{((snapshot.metrics.order_defect_rate ?? 0) / 100).toFixed(2)}%</td>
                    <td className="py-2.5 pr-4 text-right tabular">{((snapshot.metrics.late_shipment_rate ?? 0) / 100).toFixed(2)}%</td>
                    <td className="py-2.5 pr-4 text-right tabular">{((snapshot.metrics.pre_fulfilment_cancellation_rate ?? 0) / 100).toFixed(2)}%</td>
                    <td className="py-2.5 pr-4 text-right tabular">{((snapshot.metrics.valid_tracking_rate ?? 0) / 100).toFixed(2)}%</td>
                    <td className="py-2.5 text-right tabular">{snapshot.metrics.message_response_time ?? 0} h</td>
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
