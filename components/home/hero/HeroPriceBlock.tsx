"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { useCart } from "@/components/cart/CartProvider";
import { RollingDigits } from "@/components/motion/RollingDigits";
import type { HeroSlide } from "@/lib/commerce/types";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/money";
import { duration, ease } from "@/lib/motion/tokens";

/**
 * Bottom-left price block (H05): full product name, live price with rolling
 * digits, struck MRP + % off only when discounted, and Quick add — a size
 * popover that adds through the normal cart action (Splash to Bag), with
 * sold-out sizes respected.
 */
export function HeroPriceBlock({ slide }: { slide: HeroSlide }) {
  const { add } = useCart();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [slide.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onClick = (event: MouseEvent): void => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const discount = slide.product.mrpPaise > slide.product.pricePaise
    ? Math.round((1 - slide.product.pricePaise / slide.product.mrpPaise) * 100)
    : 0;

  const quickAdd = async (variantId: string): Promise<void> => {
    setBusy(true);
    const rect = triggerRef.current?.getBoundingClientRect();
    await add(variantId, 1, rect ? { image: slide.product.thumbnail, from: rect } : undefined);
    setBusy(false);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} data-meta className="relative">
      <p className="font-mono text-eyebrow uppercase text-aqua">
        <span className="block overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={slide.product.name}
              initial={{ y: "110%" }}
              animate={{ y: "0%" }}
              exit={{ y: "-110%" }}
              transition={{ duration: duration.base, ease: ease.tide }}
              className="block"
            >
              {slide.product.name}
            </motion.span>
          </AnimatePresence>
        </span>
      </p>
      <p className="mt-1 font-body text-h3 tabular text-foam">
        ₹<RollingDigits value={Math.round(slide.product.pricePaise / 100)} />
        {discount > 0 ? (
          <span className="ml-2 align-middle font-body text-small tabular text-mist line-through">
            {formatINR(slide.product.mrpPaise)}
          </span>
        ) : null}
        {discount > 0 ? (
          <span className="ml-2 align-middle font-mono text-size text-mist">{discount}% off</span>
        ) : null}
      </p>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        className="link-draw mt-2 font-mono text-eyebrow uppercase text-mist transition-colors duration-quick ease-tide hover:text-foam"
      >
        Quick add +
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-label={`Quick add — ${slide.product.name}, ${slide.product.colorwayName}`}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: duration.quick, ease: ease.tide }}
            className="absolute bottom-full left-0 z-modal mb-3 w-64 border border-hairline bg-abyss p-4 shadow-2xl shadow-black/50"
          >
            <p className="font-mono text-eyebrow uppercase text-mist">
              {slide.product.name} · {slide.product.colorwayName}
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {slide.product.sizes.map((size) => {
                const soldOut = size.available <= 0;
                return (
                  <button
                    key={size.variantId}
                    type="button"
                    disabled={soldOut || busy}
                    aria-label={`UK ${size.label}${soldOut ? ", sold out" : ""}`}
                    onClick={() => void quickAdd(size.variantId)}
                    className={cn(
                      "h-11 rounded-pill border font-mono text-size",
                      soldOut ? "border-hairline text-mist line-through" : "border-hairline text-foam hover:border-foam",
                    )}
                  >
                    {size.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 font-mono text-eyebrow text-mist">UK sizing · GST inclusive</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
