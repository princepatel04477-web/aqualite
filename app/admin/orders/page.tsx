import Link from "next/link";

import { Heading } from "@/components/ui/Heading";
import { listOrders } from "@/lib/store/engine";
import { formatINR } from "@/lib/money";

const filters = ["all", "pending_payment", "unshipped", "late", "today", "cod_confirmed", "returns", "attention"] as const;
type Filter = (typeof filters)[number];

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter: requested } = await searchParams;
  const filter: Filter = filters.find((value) => value === requested) ?? "all";
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const orders = (await listOrders()).filter((order) => {
    const shipBy = (order as typeof order & { shipByAt?: string }).shipByAt;
    const open = ["paid", "cod_confirmed", "packed"].includes(order.status);
    switch (filter) {
      case "pending_payment": case "cod_confirmed": return order.status === filter;
      case "unshipped": return open;
      case "late": return open && !!shipBy && new Date(shipBy) < now;
      case "today": return open && !!shipBy && new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(shipBy)) === today;
      case "returns": return ["return_requested", "returned"].includes(order.status);
      case "attention": return order.needsAttention;
      default: return true;
    }
  });
  return (
    <div>
      <Heading level={1} size="h2">Orders</Heading>
      <div className="mt-5 flex flex-wrap gap-3 text-small">{filters.map((value) =>
        <Link key={value} href={value === "all" ? "/admin/orders" : `/admin/orders?filter=${value}`} className={value === filter ? "text-aqua underline" : "text-mist hover:text-aqua"}>{value.replaceAll("_", " ")}</Link>
      )}</div>
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
      {!orders.length && <p className="mt-8 text-small text-mist">No orders in this view.</p>}
    </div>
  );
}
