import Link from "next/link";
import { notFound } from "next/navigation";

import { PurchaseTrack } from "@/components/analytics/PurchaseTrack";
import { OrderStatusPoller } from "@/components/checkout/OrderStatusPoller";
import { Heading } from "@/components/ui/Heading";
import { formatINR } from "@/lib/money";
import { loadOrder } from "@/lib/orders/actions";
import { deliveryLabel, lookupPincode } from "@/lib/store/pincode";

export const metadata = { title: "Order Confirmation" };
export const dynamic = "force-dynamic";

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
  const showInvoice = query.invoice === "1";
  const order = await loadOrder(decodeURIComponent(number), token);
  if (!order) notFound();

  const pinInfo = lookupPincode(order.address.pincode);
  const etaLabel = pinInfo ? deliveryLabel(pinInfo) : "Estimated delivery in 4–6 business days";
  const statusBadge =
    order.status === "paid"
      ? "PAID"
      : order.status === "cod_confirmed"
        ? "COD CONFIRMED"
        : order.status.replaceAll("_", " ").toUpperCase();

  const tokenQuery = token ? `?t=${encodeURIComponent(token)}` : "";
  const invoiceHref = `/order/${encodeURIComponent(order.number)}${tokenQuery ? `${tokenQuery}&invoice=1` : "?invoice=1"}`;

  return (
    <div className="page-wrap py-16">
      <PurchaseTrack orderId={order.id} valuePaise={order.totalPaise} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <p className="font-mono text-eyebrow uppercase text-aqua">{order.number}</p>
          <span
            data-testid="order-status-badge"
            className="rounded-pill border border-aqua bg-red-tint px-3 py-1 font-mono text-eyebrow uppercase text-red-ink"
          >
            {statusBadge}
          </span>
        </div>
        <Link href={invoiceHref} className="font-mono text-eyebrow uppercase text-aqua hover:underline">
          {showInvoice ? "Tax Invoice" : "Download / View Invoice ↓"}
        </Link>
      </div>

      <Heading level={1} className="mt-4">
        Thank you. <em>Step</em> lightly.
      </Heading>
      <p className="mt-4 text-mist">
        {order.status === "paid" || order.status === "cod_confirmed"
          ? "Your order is confirmed."
          : `Status: ${order.status.replaceAll("_", " ")}`}
      </p>
      <OrderStatusPoller active={order.status === "pending_payment"} />

      <div className="mt-10 grid gap-8 border-y border-hairline py-8 lg:grid-cols-3">
        <div>
          <p className="font-mono text-eyebrow uppercase text-mist">Deliver to</p>
          <p className="mt-2 font-medium">{order.address.name}</p>
          <p className="text-small text-mist">
            {order.address.line1}
            {order.address.line2 ? `, ${order.address.line2}` : ""}
          </p>
          <p className="text-small text-mist">
            {order.address.city}, {order.address.state} {order.address.pincode}
          </p>
          <p className="mt-1 font-mono text-size text-mist">{order.phone}</p>
        </div>
        <div>
          <p className="font-mono text-eyebrow uppercase text-mist">Delivery ETA</p>
          <p className="mt-2 font-medium">{etaLabel}</p>
          {order.trackingCarrier && order.trackingNumber ? (
            <p className="mt-1 font-mono text-size text-aqua">
              {order.trackingCarrier} · {order.trackingNumber}
            </p>
          ) : (
            <p className="mt-1 text-small text-mist">Tracking details are emailed once dispatched.</p>
          )}
        </div>
        <div>
          <p className="font-mono text-eyebrow uppercase text-mist">Payment</p>
          <p className="mt-2 font-medium capitalize">
            {order.paymentMethod === "razorpay" ? "Razorpay Online" : "Cash on Delivery"} · {statusBadge}
          </p>
          <p className="tabular text-lead font-medium">{formatINR(order.totalPaise)}</p>
          {order.discountPaise > 0 ? (
            <p className="mt-1 tabular text-small text-red-ink">
              {order.promotionCode ?? order.promotionName ?? "Offer"} saved you {formatINR(order.discountPaise)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="font-mono text-eyebrow uppercase text-mist">Items</p>
          <ul className="mt-4 divide-y divide-hairline border-t border-hairline">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <p className="font-mono text-size text-mist">
                    {item.colorwayName} · UK {item.sizeUk} · SKU {item.sku} × {item.qty}
                  </p>
                </div>
                <span className="tabular font-medium">
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
        </div>

        <aside className="h-fit border border-hairline bg-porcelain p-6 lg:col-span-5">
          <p className="font-mono text-eyebrow uppercase text-mist">
            {showInvoice ? `Tax Invoice · INV-${order.number}` : "Order Totals"}
          </p>
          <div className="mt-4 space-y-2 text-small">
            <p className="flex justify-between">
              <span className="text-mist">Subtotal</span>
              <span className="tabular">{formatINR(order.subtotalPaise)}</span>
            </p>
            {order.discountPaise > 0 ? (
              <p className="flex justify-between text-red-ink">
                <span>Discount ({order.promotionCode ?? order.promotionName ?? "Promo"})</span>
                <span className="tabular">−{formatINR(order.discountPaise)}</span>
              </p>
            ) : null}
            <p className="flex justify-between">
              <span className="text-mist">Shipping</span>
              <span className="tabular">{order.shippingPaise === 0 ? "Free" : formatINR(order.shippingPaise)}</span>
            </p>
            {order.codFeePaise > 0 ? (
              <p className="flex justify-between">
                <span className="text-mist">COD fee</span>
                <span className="tabular">{formatINR(order.codFeePaise)}</span>
              </p>
            ) : null}
            <p className="flex justify-between">
              <span className="text-mist">Includes GST</span>
              <span className="tabular">{formatINR(order.taxPaise)}</span>
            </p>
            <p className="flex justify-between border-t border-hairline pt-3 text-body font-medium">
              <span>Total</span>
              <span className="tabular">{formatINR(order.totalPaise)}</span>
            </p>
          </div>
          {showInvoice ? (
            <p className="mt-4 border-t border-hairline pt-3 font-mono text-eyebrow uppercase text-mist">
              Seller: Aqualite Footwear · Country of Origin: India
            </p>
          ) : null}
        </aside>
      </div>

      <div className="mt-10 flex flex-wrap gap-6">
        <Link href="/track" className="link-draw">
          Track your order
        </Link>
        <Link href="/shop" className="link-draw">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
