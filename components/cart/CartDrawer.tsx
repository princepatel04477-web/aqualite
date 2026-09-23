"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";

import { useCart } from "@/components/cart/CartProvider";
import { useLenis } from "@/components/motion/SmoothScroll";
import { Button } from "@/components/ui/Button";
import { IconClose, IconMinus, IconPlus } from "@/components/ui/Icons";
import { formatINR } from "@/lib/money";
import { duration, ease } from "@/lib/motion/tokens";

export function CartDrawer() {
  const { summary, open, setOpen, update, remove } = useCart();
  const { lock, unlock } = useLenis();

  useEffect(() => {
    if (!open) return;
    lock();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [lock, open, setOpen, unlock]);

  const progress = summary.subtotalPaise <= 0 ? 0 : Math.min(1, summary.subtotalPaise / (summary.subtotalPaise + summary.freeShippingRemainingPaise || 1));

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close bag"
            className="fixed inset-0 z-drawer bg-abyss/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Bag"
            className="fixed inset-y-0 right-0 z-drawer flex w-full max-w-[440px] flex-col bg-trench"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: duration.base, ease: ease.tide }}
          >
            <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
              <p className="font-mono text-eyebrow uppercase text-mist">Bag · {summary.count}</p>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)}>
                <IconClose />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="font-body text-small text-mist">
                {summary.freeShippingRemainingPaise > 0
                  ? `${formatINR(summary.freeShippingRemainingPaise)} away from free shipping`
                  : "Free shipping unlocked"}
              </p>
              <div className="mt-2 h-px origin-left bg-hairline">
                <motion.div className="h-px origin-left bg-aqua" initial={false} animate={{ scaleX: progress || 0.04 }} />
              </div>
            </div>
            <div className="flex-1 overflow-auto px-5">
              {summary.lines.length === 0 ? (
                <div className="py-16">
                  <p className="heading-display font-display text-h3">
                    Your bag is <em>light</em>.
                  </p>
                  <div className="mt-6 flex flex-col gap-2">
                    <Link href="/shop/men" onClick={() => setOpen(false)} className="link-draw">Men</Link>
                    <Link href="/shop/women" onClick={() => setOpen(false)} className="link-draw">Women</Link>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-hairline">
                  {summary.lines.map((line) => (
                    <li key={line.variantId} className="flex gap-3 py-4">
                      <Link href={`/product/${line.productSlug}?color=${line.colorwaySlug}`} className="stage h-24 w-20 shrink-0 overflow-hidden" onClick={() => setOpen(false)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={line.image} alt="" className="h-full w-full object-cover" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <p className="font-body font-medium">{line.productName}</p>
                        <p className="font-mono text-size text-mist">
                          {line.colorwayName} · UK {line.sizeLabel}
                        </p>
                        {line.isShort ? (
                          <p className="mt-1 font-body text-small text-warning">Only {line.available} left.</p>
                        ) : null}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center border border-hairline">
                            <button type="button" className="grid h-9 w-9 place-items-center" aria-label="Decrease quantity" onClick={() => void update(line.variantId, line.qty - 1)}>
                              <IconMinus />
                            </button>
                            <span className="w-6 text-center font-mono text-size tabular">{line.qty}</span>
                            <button type="button" className="grid h-9 w-9 place-items-center" aria-label="Increase quantity" disabled={line.qty >= 10 || line.qty >= line.available} onClick={() => void update(line.variantId, line.qty + 1)}>
                              <IconPlus />
                            </button>
                          </div>
                          <span className="tabular">{formatINR(line.lineTotalPaise)}</span>
                        </div>
                        <button type="button" className="mt-2 font-mono text-eyebrow uppercase text-mist" onClick={() => void remove(line.variantId)}>
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-hairline px-5 py-5">
              <div className="mb-1 flex justify-between font-body">
                <span>Subtotal</span>
                <span className="tabular">{formatINR(summary.subtotalPaise)}</span>
              </div>
              <p className="mb-4 font-body text-small text-mist">Taxes included. Shipping calculated at checkout.</p>
              <Button href="/checkout" className="w-full" variant="primary" onClick={() => setOpen(false)}>
                Checkout
              </Button>
              <Link href="/bag" onClick={() => setOpen(false)} className="mt-3 block text-center font-mono text-eyebrow uppercase text-mist">
                View bag
              </Link>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
