import Link from "next/link";

import { StatusPill } from "@/components/ui/StatusPill";
import { PromotionRowActions } from "@/components/seller/PromotionRowActions";
import { formatINR } from "@/lib/money";
import { promotionRow } from "@/lib/hub/promotions/summary";
import { listOrders, listPromotions, listRedemptions } from "@/lib/store/engine";

export const metadata = { title: "Promotions · Seller Hub" };

function windowLabel(row: { startsAt: string; endsAt: string | null }): string {
  const start = new Date(row.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const end = row.endsAt
    ? new Date(row.endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "open";
  return `${start} → ${end}`;
}

export default async function PromotionsPage() {
  const [promotions, redemptions, orders] = await Promise.all([
    listPromotions(),
    listRedemptions(),
    listOrders(),
  ]);
  const rows = promotions.map((promotion) => promotionRow(promotion, redemptions, orders));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-hub-title font-display">Promotions</h1>
          <p className="mt-1 text-hub-body text-muted">
            Coupons and automatic offers. Prices and totals are always recomputed on the server.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/seller/promotions/coupons/new"
            className="inline-flex h-9 items-center rounded-control bg-red px-4 font-body text-hub-body font-medium uppercase text-on-red transition-colors duration-quick hover:bg-red-deep"
          >
            New coupon
          </Link>
          <Link
            href="/seller/promotions/automatic/new"
            className="inline-flex h-9 items-center rounded-control border border-rule bg-paper px-4 font-body text-hub-body font-medium uppercase transition-colors duration-quick hover:bg-linen"
          >
            New automatic
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-hub border border-hairline bg-paper p-10 text-center">
          <p className="text-hub-section font-semibold">No promotions yet</p>
          <p className="mt-2 text-hub-body text-muted">
            Create a coupon customers type in, or an automatic offer that lands in the bag by itself.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-hub border border-hairline bg-paper">
          <table className="w-full min-w-[860px] border-collapse text-hub-table">
            <thead>
              <tr className="border-b border-hairline bg-linen text-left font-mono text-hub-label uppercase text-muted">
                <th className="px-4 py-2.5 font-medium">Promotion</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Offer</th>
                <th className="px-4 py-2.5 font-medium">Window</th>
                <th className="px-4 py-2.5 text-right font-medium">Redemptions</th>
                <th className="px-4 py-2.5 text-right font-medium">Discount given</th>
                <th className="px-4 py-2.5 text-right font-medium">Revenue</th>
                <th className="px-4 py-2.5 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-hairline last:border-0 hover:bg-linen/50">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/seller/promotions/${row.kind === "coupon" ? "coupons" : "automatic"}/${row.id}`}
                      className="font-medium text-red-ink"
                    >
                      {row.code ?? row.name}
                    </Link>
                    <p className="text-hub-label text-muted">{row.kind === "coupon" ? row.name : "Automatic"}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusPill status={row.status.charAt(0).toUpperCase() + row.status.slice(1)} />
                  </td>
                  <td className="px-4 py-2.5">{row.discountLabel}</td>
                  <td className="px-4 py-2.5 text-muted">{windowLabel(row)}</td>
                  <td className="px-4 py-2.5 text-right tabular">{row.redemptions}</td>
                  <td className="px-4 py-2.5 text-right tabular">{formatINR(row.discountGivenPaise)}</td>
                  <td className="px-4 py-2.5 text-right tabular">{formatINR(row.revenuePaise)}</td>
                  <td className="px-4 py-2.5">
                    <PromotionRowActions
                      id={row.id}
                      paused={row.status === "paused"}
                      expired={row.status === "expired"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
