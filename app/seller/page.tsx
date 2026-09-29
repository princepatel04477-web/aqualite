import Link from "next/link";

import { dashboard, listOrders, listRedemptions, listPromotions } from "@/lib/store/engine";
import { formatINR } from "@/lib/money";
import { promotionRow } from "@/lib/hub/promotions/summary";

export default async function SellerHome() {
  const [data, orders, redemptions, promotions] = await Promise.all([
    dashboard(),
    listOrders(),
    listRedemptions(),
    listPromotions(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const live = orders.filter((order) => !["cancelled", "payment_failed"].includes(order.status));
  const todayOrders = live.filter((order) => order.createdAt.slice(0, 10) === today);
  const revenue = todayOrders.reduce((sum, order) => sum + order.totalPaise, 0);
  const discountGiven = redemptions
    .filter((row) => row.releasedAt === null)
    .reduce((sum, row) => sum + row.discountPaise, 0);
  const open = data.orders.filter((order) => order.needsAttention).length;
  return (
    <div>
      <h1 className="text-hub-title font-display">Overview</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Ordered sales today" value={formatINR(revenue)} />
        <Kpi label="Orders today" value={String(todayOrders.length)} />
        <Kpi label="Needs attention" value={String(open)} />
        <Kpi label="Discount given" value={formatINR(discountGiven)} />
      </div>

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
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-hub border border-hairline bg-paper p-5">
      <p className="font-mono text-hub-label uppercase text-muted">{label}</p>
      <p className="mt-2 text-hub-kpi font-semibold tabular">{value}</p>
    </div>
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
