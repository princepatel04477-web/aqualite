import Link from "next/link";

import { SellerOrderRowAction } from "@/components/seller/SellerOrderRowAction";
import { Heading } from "@/components/ui/Heading";
import { formatINR } from "@/lib/money";
import { listOrders } from "@/lib/store/engine";

export const metadata = { title: "Orders — Seller Hub" };
export const dynamic = "force-dynamic";

const filters = [
  "all",
  "pending_payment",
  "unshipped",
  "late",
  "today",
  "cod_confirmed",
  "returns",
  "attention",
] as const;
type Filter = (typeof filters)[number];

export default async function SellerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: requested } = await searchParams;
  const filter: Filter = filters.find((value) => value === requested) ?? "all";
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const orders = (await listOrders()).filter((order) => {
    const shipBy = (order as typeof order & { shipByAt?: string }).shipByAt;
    const open = ["paid", "cod_confirmed", "packed"].includes(order.status);
    switch (filter) {
      case "pending_payment":
      case "cod_confirmed":
        return order.status === filter;
      case "unshipped":
        return open;
      case "late":
        return open && !!shipBy && new Date(shipBy) < now;
      case "today":
        return (
          open &&
          !!shipBy &&
          new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date(shipBy)) === today
        );
      case "returns":
        return ["return_requested", "returned"].includes(order.status);
      case "attention":
        return order.needsAttention;
      default:
        return true;
    }
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Heading level={1} size="h2">
          Orders
        </Heading>
        <p className="font-mono text-eyebrow uppercase text-mist">{orders.length} orders</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-3 text-small">
        {filters.map((value) => (
          <Link
            key={value}
            href={value === "all" ? "/seller/orders" : `/seller/orders?filter=${value}`}
            className={
              value === filter
                ? "rounded-pill bg-red-tint px-3 py-1 font-medium text-red-ink"
                : "rounded-pill border border-hairline px-3 py-1 text-mist hover:text-aqua"
            }
          >
            {value.replaceAll("_", " ")}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="mt-8 text-small text-mist">No orders in this view.</p>
      ) : (
        <div className="mt-8 overflow-x-auto border border-hairline bg-porcelain">
          <table className="w-full text-left text-small">
            <thead className="border-b border-hairline font-mono text-eyebrow uppercase text-mist">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {orders.map((order) => (
                <tr key={order.id} data-order-number={order.number}>
                  <td className="px-4 py-3 font-mono">
                    <Link href={`/seller/orders/${order.number}`} className="text-red-ink hover:underline">
                      {order.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize" data-order-status={order.status}>
                    {order.status.replaceAll("_", " ")}
                  </td>
                  <td className="px-4 py-3 text-mist">
                    <div>{order.address.name}</div>
                    <div className="font-mono text-eyebrow">{order.email}</div>
                  </td>
                  <td className="px-4 py-3 uppercase font-mono text-size text-mist">
                    {order.paymentMethod}
                  </td>
                  <td className="px-4 py-3 text-right tabular font-medium">
                    {formatINR(order.totalPaise)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <SellerOrderRowAction orderId={order.id} status={order.status} />
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
