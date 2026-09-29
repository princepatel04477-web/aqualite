import { notFound, redirect } from "next/navigation";

import { cancelOrderAction } from "@/lib/account/actions";
import { orderThread } from "@/lib/account/messages";
import { CustomerMessageForm } from "@/components/account/CustomerMessageForm";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { readSession } from "@/lib/auth/session";
import { getOrderByNumber } from "@/lib/store/engine";
import { formatINR } from "@/lib/money";

export default async function AccountOrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const session = await readSession();
  if (!session) redirect(`/login?next=/account/orders/${number}`);
  const order = await getOrderByNumber(decodeURIComponent(number));
  if (!order || order.userId !== session.id) notFound();
  const canCancel = ["pending_payment", "cod_confirmed", "paid"].includes(order.status);
  const threadState = await orderThread(order.number);
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
      {order.discountPaise > 0 ? (
        <p className="mt-3 text-red-ink">
          {order.promotionCode ?? order.promotionName ?? "Offer"} · −{formatINR(order.discountPaise)} · total {formatINR(order.totalPaise)}
        </p>
      ) : null}
      {order.trackingNumber ? <p className="mt-6 font-mono text-size">Tracking {order.trackingCarrier} {order.trackingNumber}</p> : null}
      {canCancel ? (
        <form className="mt-8" action={async () => { "use server"; await cancelOrderAction(order.number); }}>
          <Button type="submit" variant="outline">Cancel order</Button>
        </form>
      ) : null}

      <section className="mt-12 border-t border-hairline pt-8">
        <h2 className="font-mono text-eyebrow uppercase text-aqua">Messages with the team</h2>
        {threadState ? (
          <ul className="mt-4 space-y-3">
            {threadState.messages.map((message) => (
              <li
                key={message.id}
                className={`rounded-panel border p-3 ${
                  message.direction === "out" ? "border-red/30 bg-red-tint/30" : "border-hairline"
                }`}
              >
                <p className="font-mono text-size uppercase text-mist">
                  {message.direction === "out" ? "Aqualite" : "You"} ·{" "}
                  {message.sentAt.slice(0, 16).replace("T", " ")}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-small text-mist">
            No messages yet — ask anything about this order and the team replies here.
          </p>
        )}
        <CustomerMessageForm orderNumber={order.number} />
      </section>
    </div>
  );
}
