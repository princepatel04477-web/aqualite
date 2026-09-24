"use client";

import { useEffect, useRef, useState } from "react";

import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import { useCart } from "@/components/cart/CartProvider";
import type { ProductCardModel } from "@/lib/commerce/types";
import { cn } from "@/lib/cn";

/**
 * Touch quick-add (M07): tapping a card's "+" opens a size bottom
 * sheet — thumb, name, price from server data, a 4-up grid of 48px
 * size pills with sold-out struck through, and a primary "Add to bag".
 * Adding closes the sheet; the M05 toast-card confirms.
 */
export function QuickAddSheet({
  open,
  onClose,
  card,
  active,
}: {
  open: boolean;
  onClose: () => void;
  card: ProductCardModel;
  active: NonNullable<ProductCardModel["colorways"][number]>;
}) {
  const { add } = useCart();
  const [variantId, setVariantId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const thumb = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (open) setVariantId(null);
  }, [open]);

  const onAdd = async () => {
    if (!variantId || busy) return;
    setBusy(true);
    const from = thumb.current?.getBoundingClientRect();
    const ok = await add(
      variantId,
      1,
      from ? { image: active.image, from } : undefined,
    );
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label={`Add ${card.name}`}
      footer={
        <Button
          type="button"
          variant="primary"
          className="w-full"
          loading={busy}
          disabled={!variantId}
          onClick={() => void onAdd()}
        >
          {variantId ? "Add to bag" : "Select a size"}
        </Button>
      }
    >
      <div className="flex gap-3">
        <span
          ref={thumb}
          className="stage block h-20 w-16 shrink-0 overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.image}
            alt=""
            className="h-full w-full object-cover"
          />
        </span>
        <div className="min-w-0">
          <p className="font-body font-medium">{card.name}</p>
          <p className="mt-0.5 font-mono text-size text-mist">{active.name}</p>
          <Price
            paise={active.pricePaise}
            mrpPaise={active.mrpPaise}
            className="mt-1"
          />
        </div>
      </div>
      <p className="mt-5 font-mono text-eyebrow uppercase text-mist">UK size</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {active.sizes.map((size) => {
          const soldOut = size.available <= 0;
          const selected = size.variantId === variantId;
          return (
            <button
              key={size.variantId}
              type="button"
              disabled={soldOut}
              aria-pressed={selected}
              aria-label={`UK ${size.label}${soldOut ? ", sold out" : ""}`}
              className={cn(
                "h-12 rounded-pill border font-mono text-size transition-colors duration-quick ease-tide",
                selected
                  ? "border-foam bg-foam text-abyss"
                  : "border-hairline text-foam",
                soldOut && "text-mist line-through",
              )}
              onClick={() => setVariantId(size.variantId)}
            >
              {size.label}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
