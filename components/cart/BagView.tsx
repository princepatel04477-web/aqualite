"use client";

import Link from "next/link";

import { BagTotals } from "@/components/cart/BagTotals";
import { useCart } from "@/components/cart/CartProvider";
import { IconMinus, IconPlus } from "@/components/ui/Icons";
import { formatINR } from "@/lib/money";

export function BagView() {
  const { summary, update, remove } = useCart();
  const progress =
    summary.subtotalPaise <= 0
      ? 0
      : Math.min(1, summary.subtotalPaise / (summary.subtotalPaise + summary.freeShippingRemainingPaise || 1));

  if (summary.lines.length === 0) {
    return (
      <p className="mt-6 text-mist">
        Nothing here yet.{" "}
        <Link href="/shop" className="link-draw">
          Shop the edit
        </Link>
      </p>
    );
  }

  return (
    <div className="mt-8">
      <div className="max-w-xl border border-hairline bg-trench p-4">
        <p className="font-body text-small text-mist">
          {summary.freeShippingRemainingPaise > 0
            ? `${formatINR(summary.freeShippingRemainingPaise)} away from free shipping`
            : "Free shipping unlocked"}
        </p>
        <div className="mt-2 h-1 w-full overflow-hidden bg-hairline">
          <div
            className="h-full bg-aqua transition-all duration-base"
            style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }}
          />
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-12">
        <ul className="divide-y divide-hairline lg:col-span-7">
          {summary.lines.map((line) => (
            <li key={line.variantId} className="flex gap-4 py-5">
              <Link
                href={`/product/${line.productSlug}?color=${line.colorwaySlug}`}
                className="stage h-28 w-24 shrink-0 overflow-hidden bg-porcelain"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={line.image} alt={line.productName} className="h-full w-full object-cover" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/product/${line.productSlug}?color=${line.colorwaySlug}`}
                      className="font-body font-medium hover:text-aqua"
                    >
                      {line.productName}
                    </Link>
                    <p className="font-mono text-size text-mist">
                      {line.colorwayName} · UK {line.sizeLabel}
                    </p>
                  </div>
                  <p className="tabular font-medium">{formatINR(line.lineTotalPaise)}</p>
                </div>
                {line.isShort ? (
                  <p className="mt-1 font-body text-small text-warning">Only {line.available} left.</p>
                ) : null}
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-center border border-hairline">
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center"
                      aria-label="Decrease quantity"
                      onClick={() => void update(line.variantId, line.qty - 1)}
                    >
                      <IconMinus />
                    </button>
                    <span className="w-8 text-center font-mono text-size tabular">{line.qty}</span>
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center disabled:opacity-40"
                      aria-label="Increase quantity"
                      disabled={line.qty >= 10 || line.qty >= line.available}
                      onClick={() => void update(line.variantId, line.qty + 1)}
                    >
                      <IconPlus />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="font-mono text-eyebrow uppercase text-mist hover:text-aqua"
                    onClick={() => void remove(line.variantId)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <BagTotals />
      </div>
    </div>
  );
}
