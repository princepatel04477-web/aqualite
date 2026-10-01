"use client";

import { useCart } from "@/components/cart/CartProvider";
import { CouponField } from "@/components/cart/CouponField";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/money";

/** Bag-page totals rail — live server quote including promotions. */
export function BagTotals({ email }: { email?: string }) {
  const { summary } = useCart();
  return (
    <aside className="h-fit border border-hairline p-6 lg:col-span-4 lg:col-start-9">
      <p className="flex justify-between">
        <span>Subtotal</span>
        <span className="tabular">{formatINR(summary.subtotalPaise)}</span>
      </p>
      {summary.autoPromo ? (
        <p className="mt-2 flex justify-between text-red-ink">
          <span>{summary.autoPromo.name}</span>
          <span className="tabular">−{formatINR(summary.autoPromo.discountPaise)}</span>
        </p>
      ) : null}
      {summary.promo ? (
        <p className="mt-2 flex justify-between text-red-ink">
          <span>{summary.promo.code ?? summary.promo.name}</span>
          <span className="tabular">−{formatINR(summary.promo.discountPaise)}</span>
        </p>
      ) : null}
      <p className="mt-2 flex justify-between text-mist">
        <span>Shipping</span>
        <span className="tabular">{formatINR(summary.shippingPaise)}</span>
      </p>
      <p className="mt-1 flex justify-between text-mist">
        <span>Including GST</span>
        <span className="tabular">{formatINR(summary.taxPaise)}</span>
      </p>
      <p className="mt-4 flex justify-between font-medium">
        <span>Total</span>
        <span className="tabular">{formatINR(summary.totalPaise)}</span>
      </p>
      <CouponField email={email} />
      <Button href="/checkout" variant="primary" className="mt-6 w-full">
        Checkout
      </Button>
    </aside>
  );
}
