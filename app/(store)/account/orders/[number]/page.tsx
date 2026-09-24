import { notFound, redirect } from "next/navigation";

import { cancelOrderAction } from "@/lib/account/actions";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { readSession } from "@/lib/auth/session";
import { getOrderByNumber } from "@/lib/store/engine";
import { formatINR } from "@/lib/money";

export default async function AccountOrderPage({ params }: { params: { number: string } }) {
  const session = await readSession();
  if (!session) redirect(`/login?next=/account/orders/${params.number}`);
  const order = await getOrderByNumber(decodeURIComponent(params.number));
  if (!order || order.userId !== session.id) notFound();
  const canCancel = ["pending_payment", "cod_confirmed", "paid"].includes(order.status);
  return (
    <div className="page-wrap py-16">
      <p className="font-mono text-eyebrow uppercase text-aqua">{order.number}</p>
      <Heading level={1} className="mt-3 capitalize">{order.status.replaceAll("_", " ")}</Heading>
      <ol className="mt-8 space-y-3 border-l border-hairline pl-4">
        {order.events.map((event) => (
          <li key={event.id}>
            <p className="font-mono text-size text-aqua">{event.to.replaceAll("_", " ")}</p>
            <p className="text-small text-mist">{event.note}</p>
          </li>
        ))}
      </ol>
      <ul className="mt-8 divide-y divide-hairline">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between py-3">
            <span>{item.productName} · {item.sku}</span>
            <span className="tabular">{formatINR(item.lineTotalPaise)}</span>
          </li>
        ))}
      </ul>
      {order.trackingNumber ? <p className="mt-6 font-mono text-size">Tracking {order.trackingCarrier} {order.trackingNumber}</p> : null}
      {canCancel ? (
        <form className="mt-8" action={async () => { "use server"; await cancelOrderAction(order.number); }}>
          <Button type="submit" variant="outline">Cancel order</Button>
        </form>
      ) : null}
    </div>
  );
}
