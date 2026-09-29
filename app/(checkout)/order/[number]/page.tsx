import Link from "next/link";
import { notFound } from "next/navigation";

import { PurchaseTrack } from "@/components/analytics/PurchaseTrack";
import { Heading } from "@/components/ui/Heading";
import { loadOrder } from "@/lib/orders/actions";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Order" };

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { number } = await params;
  const query = await searchParams;
  const token = typeof query.t === "string" ? query.t : undefined;
  const order = await loadOrder(decodeURIComponent(number), token);
  if (!order) notFound();
  return (
    <div className="page-wrap py-16">
      <PurchaseTrack orderId={order.id} valuePaise={order.totalPaise} />
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
          {order.discountPaise > 0 ? (
            <p className="mt-1 tabular text-red-ink">
              {order.promotionCode ?? order.promotionName ?? "Offer"} saved you {formatINR(order.discountPaise)}
            </p>
          ) : null}
        </div>
      </div>
      <ul className="mt-10 divide-y divide-hairline">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between py-4">
            <span>{item.productName} · UK {item.sizeUk} × {item.qty}</span>
            <span className="tabular">
              {item.discountPaise > 0 ? (
                <>
                  <s className="mr-2 text-mist">{formatINR(item.lineTotalPaise)}</s>
                  {formatINR(item.lineTotalPaise - item.discountPaise)}
                </>
              ) : (
                formatINR(item.lineTotalPaise)
              )}
            </span>
          </li>
        ))}
      </ul>
      <Link href="/track" className="mt-8 inline-block link-draw">Track your order</Link>
    </div>
  );
}
