import Link from "next/link";

import { Heading } from "@/components/ui/Heading";
import { listOrders } from "@/lib/store/engine";
import { formatINR } from "@/lib/money";

export default async function AdminOrdersPage() {
  const orders = await listOrders();
  return (
    <div>
      <Heading level={1} size="h2">Orders</Heading>
      <ul className="mt-8 divide-y divide-hairline">
        {orders.map((order) => (
          <li key={order.id} className="grid grid-cols-4 gap-3 py-3 text-small">
            <Link href={`/admin/orders/${order.number}`} className="font-mono text-aqua">{order.number}</Link>
            <span className="capitalize">{order.status.replaceAll("_", " ")}</span>
            <span className="truncate text-mist">{order.email}</span>
            <span className="tabular text-right">{formatINR(order.totalPaise)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
