"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { useCart } from "@/components/cart/CartProvider";
import { RollingDigits } from "@/components/motion/RollingDigits";
import type { HeroSlide } from "@/lib/commerce/types";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/money";
import { duration, ease } from "@/lib/motion/tokens";

export function HeroPriceBlock({ slide, variant = "block" }: { slide: HeroSlide; variant?: "block" | "line" }) {
  const { add } = useCart();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [prevSlideId, setPrevSlideId] = useState(slide.id);
  if (prevSlideId !== slide.id) {
    setPrevSlideId(slide.id);
    setOpen(false);
  }

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

  const discount =
    slide.product.mrpPaise > slide.product.pricePaise
      ? Math.round((1 - slide.product.pricePaise / slide.product.mrpPaise) * 100)
      : 0;

  const quickAdd = async (variantId: string): Promise<void> => {
    setBusy(true);
    const rect = triggerRef.current?.getBoundingClientRect();
    await add(variantId, 1, rect ? { image: slide.product.thumbnail, from: rect } : undefined);
    setBusy(false);
    setOpen(false);
  };

  const nameSwap = (cls = ""): React.ReactNode => (
    <span className={cn("block overflow-hidden", cls)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={slide.product.name}
          initial={{ y: "110%" }}
          animate={{ y: "0%" }}
          exit={{ y: "-110%" }}
          transition={{ duration: duration.base, ease: ease.tide }}
          className="block whitespace-nowrap"
        >
          {slide.product.name}
        </motion.span>
      </AnimatePresence>
    </span>
  );

  const popover = (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-label={`Quick add — ${slide.product.name}, ${slide.product.colorwayName}`}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: duration.quick, ease: ease.tide }}
          className="absolute bottom-full left-0 z-modal mb-3 w-64 border border-hairline bg-paper p-4 shadow-2"
        >
          <p className="font-mono text-eyebrow uppercase text-ink-2">
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
                    soldOut
                      ? "border-hairline text-muted line-through"
                      : "border-rule text-ink hover:border-ink",
                  )}
                >
                  {size.label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 font-mono text-eyebrow text-muted">UK sizing · GST inclusive</p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (variant === "line") {
    return (
      <div ref={wrapRef} data-meta className="relative mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-mono text-eyebrow uppercase text-red-ink">{nameSwap("inline-block")}</span>
        <span aria-hidden="true" className="font-mono text-eyebrow text-muted">
          ·
        </span>
        <span className="font-mono text-eyebrow tabular text-ink">
          ₹<RollingDigits value={Math.round(slide.product.pricePaise / 100)} />
        </span>
        {discount > 0 ? (
          <span className="font-mono text-eyebrow tabular text-muted line-through">
            {formatINR(slide.product.mrpPaise)}
          </span>
        ) : null}
        <span aria-hidden="true" className="font-mono text-eyebrow text-muted">
          ·
        </span>
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((current) => !current)}
          className="font-mono text-eyebrow uppercase text-ink-2 transition-colors duration-quick ease-tide hover:text-ink"
        >
          Quick add +
        </button>
        {popover}
      </div>
    );
  }

  return (
    <div ref={wrapRef} data-meta className="relative">
      <p className="font-mono text-eyebrow uppercase text-red-ink">{nameSwap()}</p>
      <p className="mt-0.5 whitespace-nowrap font-body text-h3 tabular leading-tight text-ink">
        ₹<RollingDigits value={Math.round(slide.product.pricePaise / 100)} />
        {discount > 0 ? (
          <span className="ml-2 align-middle font-body text-small tabular text-muted line-through">
            {formatINR(slide.product.mrpPaise)}
          </span>
        ) : null}
        {discount > 0 ? (
          <span className="ml-2 align-middle font-mono text-size text-red-ink">{discount}% off</span>
        ) : null}
      </p>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        className="link-draw mt-1 font-mono text-eyebrow uppercase text-ink-2 transition-colors duration-quick ease-tide hover:text-ink"
      >
        Quick add +
      </button>
      {popover}
    </div>
  );
}
