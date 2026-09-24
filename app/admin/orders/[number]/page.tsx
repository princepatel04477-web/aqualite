import { notFound } from "next/navigation";

import { AdminOrderActions } from "@/components/admin/AdminOrderActions";
import { Heading } from "@/components/ui/Heading";
import { getOrderByNumber } from "@/lib/store/engine";
import { formatINR } from "@/lib/money";

export default async function AdminOrderPage({ params }: { params: { number: string } }) {
  const order = await getOrderByNumber(decodeURIComponent(params.number));
  if (!order) notFound();
  return (
    <div>
      <p className="font-mono text-eyebrow uppercase text-aqua">{order.number}</p>
      <Heading level={1} size="h2" className="mt-2 capitalize">{order.status.replaceAll("_", " ")}</Heading>
      <p className="mt-2 text-mist">{order.email} · {order.address.city} {order.address.pincode}</p>
      <ul className="mt-6 divide-y divide-hairline">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between py-3 text-small">
            <span>{item.productName} · {item.sku} × {item.qty}</span>
            <span className="tabular">{formatINR(item.lineTotalPaise)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 tabular">{formatINR(order.totalPaise)}</p>
      <AdminOrderActions orderId={order.id} status={order.status} />
    </div>
  );
}
