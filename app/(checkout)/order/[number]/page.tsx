import Link from "next/link";
import { notFound } from "next/navigation";

import { Heading } from "@/components/ui/Heading";
import { loadOrder } from "@/lib/orders/actions";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Order" };

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: { number: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const token = typeof searchParams.t === "string" ? searchParams.t : undefined;
  const order = await loadOrder(decodeURIComponent(params.number), token);
  if (!order) notFound();
  return (
    <div className="page-wrap py-16">
      <p className="font-mono text-eyebrow uppercase text-aqua">{order.number}</p>
      <Heading level={1} className="mt-4">
        Thank you. <em>Step</em> lightly.
      </Heading>
      <p className="mt-4 text-mist">
        {order.status === "paid" || order.status === "cod_confirmed"
          ? "Your order is confirmed."
          : `Status: ${order.status.replaceAll("_", " ")}`}
      </p>
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <p className="font-mono text-eyebrow uppercase text-mist">Deliver to</p>
          <p className="mt-2">{order.address.name}</p>
          <p className="text-mist">{order.address.line1}, {order.address.city} {order.address.pincode}</p>
        </div>
        <div>
          <p className="font-mono text-eyebrow uppercase text-mist">Payment</p>
          <p className="mt-2 capitalize">{order.paymentMethod}</p>
          <p className="tabular">{formatINR(order.totalPaise)}</p>
        </div>
      </div>
      <ul className="mt-10 divide-y divide-hairline">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between py-4">
            <span>{item.productName} · UK {item.sizeUk} × {item.qty}</span>
            <span className="tabular">{formatINR(item.lineTotalPaise)}</span>
          </li>
        ))}
      </ul>
      <Link href="/track" className="mt-8 inline-block link-draw">Track your order</Link>
    </div>
  );
}
