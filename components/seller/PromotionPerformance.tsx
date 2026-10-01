import { formatINR } from "@/lib/money";
import type { PromotionPerformance as PerformanceData } from "@/lib/hub/promotions/summary";

export function PromotionPerformance({ performance }: { performance: PerformanceData }) {
  const lift =
    performance.nonPromoAovPaise > 0 && performance.promoAovPaise > 0
      ? Math.round(((performance.promoAovPaise - performance.nonPromoAovPaise) / performance.nonPromoAovPaise) * 100)
      : null;
  return (
    <section aria-label="Performance" className="mt-8">
      <h2 className="text-hub-section font-semibold">Performance</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Orders" value={String(performance.orders)} />
        <Metric label="Units" value={String(performance.units)} />
        <Metric label="Discount spent" value={formatINR(performance.discountSpentPaise)} />
        <Metric label="Promotion AOV" value={formatINR(performance.promoAovPaise)} />
        <Metric
          label="Non-promo AOV"
          value={formatINR(performance.nonPromoAovPaise)}
          detail={
            lift !== null
              ? `${lift >= 0 ? "+" : ""}${lift}% with this promotion (${performance.nonPromoOrders} other orders in window)`
              : `${performance.nonPromoOrders} other orders in window`
          }
        />
      </div>
    </section>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-hub border border-hairline bg-paper p-4">
      <p className="font-mono text-hub-label uppercase text-muted">{label}</p>
      <p className="mt-1.5 text-hub-kpi font-semibold tabular">{value}</p>
      {detail ? <p className="mt-1 text-hub-label text-muted">{detail}</p> : null}
    </div>
  );
}
