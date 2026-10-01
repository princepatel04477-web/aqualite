import Link from "next/link";
import { redirect } from "next/navigation";

import { Heading } from "@/components/ui/Heading";
import { readSession } from "@/lib/auth/session";
import { listOrders } from "@/lib/store/engine";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const session = await readSession();
  if (!session) redirect("/login?next=/account/orders");
  const orders = (await listOrders()).filter((order) => order.userId === session.id);
  return (
    <div className="page-wrap py-16">
      <Heading level={1}>Orders</Heading>
      <ul className="mt-8 divide-y divide-hairline">
        {orders.map((order) => (
          <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <Link href={`/account/orders/${order.number}`} className="font-mono text-aqua">{order.number}</Link>
            <span className="capitalize text-mist">{order.status.replaceAll("_", " ")}</span>
            <span className="tabular">{formatINR(order.totalPaise)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
