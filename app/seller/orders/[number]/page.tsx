import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminOrderActions } from "@/components/admin/AdminOrderActions";
import { Heading } from "@/components/ui/Heading";
import { formatINR } from "@/lib/money";
import { getOrderByNumber } from "@/lib/store/engine";

export const metadata = { title: "Order Detail — Seller Hub" };
export const dynamic = "force-dynamic";

export default async function SellerOrderDetailPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const order = await getOrderByNumber(decodeURIComponent(number));
  if (!order) notFound();

  return (
    <div>
      <Link href="/seller/orders" className="font-mono text-eyebrow uppercase text-mist hover:text-aqua">
        ← Back to orders
      </Link>
      <p className="mt-4 font-mono text-eyebrow uppercase text-red-ink">{order.number}</p>
      <Heading level={1} size="h2" className="mt-2 capitalize">
        {order.status.replaceAll("_", " ")}
      </Heading>
      <p className="mt-2 text-mist">
        {order.address.name} · {order.email} · {order.phone} · {order.address.city}, {order.address.state}{" "}
        {order.address.pincode}
      </p>
      {order.trackingCarrier && order.trackingNumber ? (
        <p className="mt-2 font-mono text-size text-aqua">
          Tracking: {order.trackingCarrier} · {order.trackingNumber}
        </p>
      ) : null}
      <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between py-3 text-small">
            <span>
              {item.productName} ({item.colorwayName}) · UK {item.sizeUk} · {item.sku} × {item.qty}
            </span>
            <span className="tabular font-medium">{formatINR(item.lineTotalPaise)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-between font-medium">
        <span>Total ({order.paymentMethod.toUpperCase()})</span>
        <span className="tabular">{formatINR(order.totalPaise)}</span>
      </div>
      <AdminOrderActions orderId={order.id} status={order.status} />
    </div>
  );
}
