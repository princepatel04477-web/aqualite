import Link from "next/link";

import { Heading } from "@/components/ui/Heading";
import { dashboard } from "@/lib/store/engine";
import { formatINR } from "@/lib/money";

export default async function AdminHome() {
  const data = await dashboard();
  const today = new Date().toISOString().slice(0, 10);
  const paid = data.orders.filter((order) => ["paid", "cod_confirmed", "packed", "shipped", "delivered"].includes(order.status));
  const todayOrders = paid.filter((order) => order.createdAt.slice(0, 10) === today);
  const revenue = todayOrders.reduce((sum, order) => sum + order.totalPaise, 0);
  const attention = data.orders.filter((order) => order.needsAttention || order.status === "paid" || order.status === "cod_confirmed");
  return (
    <div>
      <Heading level={1} size="h2">Desk</Heading>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Stat label="Today" value={formatINR(revenue)} />
        <Stat label="Orders today" value={String(todayOrders.length)} />
        <Stat label="Open" value={String(attention.length)} />
      </div>
      <h2 className="mt-12 font-display text-h3">Needs action</h2>
      <ul className="mt-4 divide-y divide-hairline">
        {attention.slice(0, 8).map((order) => (
          <li key={order.id} className="flex justify-between py-3">
            <Link href={`/admin/orders/${order.number}`} className="font-mono text-aqua">{order.number}</Link>
            <span className="capitalize text-mist">{order.status.replaceAll("_", " ")}</span>
          </li>
        ))}
      </ul>
      {data.outbox[0] ? (
        <p className="mt-8 font-mono text-size text-mist">Latest email · {data.outbox[0].subject}</p>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-hairline p-5">
      <p className="font-mono text-eyebrow uppercase text-mist">{label}</p>
      <p className="mt-2 font-display text-h3 tabular">{value}</p>
    </div>
  );
}
