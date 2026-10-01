import Link from "next/link";
import { Suspense } from "react";

import { WidgetGrid } from "@/components/hub/home/WidgetGrid";
import { WidgetStream, WidgetSkeleton } from "@/components/hub/home/widgets/WidgetStream";
import { getLayout } from "@/lib/hub/layout-actions";
import { dashboard, hubSnapshot, listOrders, listPromotions, listRedemptions } from "@/lib/store/engine";
import { promotionRow } from "@/lib/hub/promotions/summary";
import { WIDGET_IDS } from "@/lib/hub/metrics";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function SellerHome() {
  const [layout, snapshot, promotions, redemptions, orders, data] = await Promise.all([
    getLayout(),
    hubSnapshot(),
    listPromotions(),
    listRedemptions(),
    listOrders(),
    dashboard(),
  ]);
  const revision = [snapshot.orders.length, snapshot.orders.reduce((last, row) => row.updatedAt > last ? row.updatedAt : last, ""), snapshot.returns.map((row) => row.status).join(","), snapshot.reviews.map((row) => row.status).join(","), snapshot.payments.length, Object.values(snapshot.stock).reduce((sum, row) => sum + row.onHand + row.reserved, 0)].join("|");
  const needsAttention = data.orders.filter((order) => order.needsAttention).length;
  return (
    <section>
      <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-eyebrow uppercase tracking-widest text-aqua">Aqualite / Seller Hub</p>
          <h1 className="mt-3 font-display text-h2">Your day, <em>at a glance.</em></h1>
          <p className="mt-3 text-small text-mist">What needs you now, and how we&rsquo;re doing.</p>
        </div>
        <p className="font-mono text-eyebrow uppercase text-mist">Live operations · India Standard Time</p>
      </div>
      {needsAttention > 0 ? (
        <p className="mb-6 rounded-hub border border-warning/50 bg-warning-tint px-4 py-3 text-hub-body">
          {needsAttention} order{needsAttention > 1 ? "s need" : " needs"} attention &mdash; payment captured but stock could not be reserved.{" "}
          <Link href="/seller/orders" className="font-medium text-red-ink">Review orders &rarr;</Link>
        </p>
      ) : null}
      <WidgetGrid initial={layout} initialRevision={revision}>
        {WIDGET_IDS.map((id) => (
          <Suspense key={id} fallback={<WidgetSkeleton id={id} />}>
            <WidgetStream id={id} />
          </Suspense>
        ))}
      </WidgetGrid>

      <h2 className="mt-10 text-hub-section font-semibold">Jump in</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tile href="/seller/promotions" title="Promotions" detail="Coupons and automatic offers" />
        <Tile href="/seller/reports/business" title="Business reports" detail="Sales, traffic and conversion" />
        <Tile href="/seller/reports/payments" title="Payments" detail="Settlements and reconciliation" />
        <Tile href="/seller/performance/health" title="Account health" detail="Defects, shipping and returns" />
        <Tile href="/seller/performance/reviews" title="Reviews" detail="Moderation queue and replies" />
        <Tile href="/seller/performance/messages" title="Messages" detail="Buyer conversations" />
      </div>

      {promotions.length > 0 ? (
        <>
          <h2 className="mt-10 text-hub-section font-semibold">Promotions right now</h2>
          <ul className="mt-3 divide-y divide-hairline border border-hairline">
            {promotions.slice(0, 4).map((promotion) => {
              const row = promotionRow(promotion, redemptions, orders);
              return (
                <li key={promotion.id} className="flex items-center justify-between gap-3 px-4 py-3 text-hub-body">
                  <Link href={`/seller/promotions/${promotion.kind === "coupon" ? "coupons" : "automatic"}/${promotion.id}`} className="font-medium text-red-ink">
                    {row.code ?? row.name}
                  </Link>
                  <span className="text-muted">{row.redemptions} redemptions</span>
                  <span className="tabular">{formatINR(row.discountGivenPaise)}</span>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function Tile({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link href={href} className="rounded-hub border border-hairline bg-paper p-5 transition-colors duration-quick hover:border-rule hover:bg-linen">
      <p className="text-hub-section font-semibold">{title}</p>
      <p className="mt-1 text-hub-body text-muted">{detail}</p>
    </Link>
  );
}
