import { Suspense } from "react";

import { WidgetGrid } from "@/components/hub/home/WidgetGrid";
import { WidgetStream, WidgetSkeleton } from "@/components/hub/home/widgets/WidgetStream";
import { getLayout } from "@/lib/hub/layout-actions";
import { hubSnapshot } from "@/lib/store/engine";
import { WIDGET_IDS } from "@/lib/hub/metrics";

export const dynamic = "force-dynamic";

export default async function SellerHome() {
  const [layout, snapshot] = await Promise.all([getLayout(), hubSnapshot()]);
  const revision = [snapshot.orders.length, snapshot.orders.reduce((last, row) => row.updatedAt > last ? row.updatedAt : last, ""), snapshot.returns.map((row) => row.status).join(","), snapshot.reviews.map((row) => row.status).join(","), snapshot.payments.length, Object.values(snapshot.stock).reduce((sum, row) => sum + row.onHand + row.reserved, 0)].join("|");
  return (
    <section>
      <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-eyebrow uppercase tracking-widest text-aqua">Aqualite / Seller Hub</p>
          <h1 className="mt-3 font-display text-h2">Your day, <em>at a glance.</em></h1>
          <p className="mt-3 text-small text-mist">What needs you now, and how we’re doing.</p>
        </div>
        <p className="font-mono text-eyebrow uppercase text-mist">Live operations · India Standard Time</p>
      </div>
      <WidgetGrid initial={layout} initialRevision={revision}>
        {WIDGET_IDS.map((id) => (
          <Suspense key={id} fallback={<WidgetSkeleton id={id} />}>
            <WidgetStream id={id} />
          </Suspense>
        ))}
      </WidgetGrid>
    </section>
  );
}
