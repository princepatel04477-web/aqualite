"use client";

import Link from "next/link";
import { useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { Price } from "@/components/ui/Price";
import { Tag } from "@/components/ui/Tag";
import type { ProductCardModel } from "@/lib/commerce/types";
import { cn } from "@/lib/cn";

export function ProductCard({ card, tone = "dark" }: { card: ProductCardModel; tone?: "dark" | "light" }) {
  const { add } = useCart();
  const [color, setColor] = useState(card.colorwaySlug);
  const [open, setOpen] = useState(false);
  const active = card.colorways.find((item) => item.slug === color) ?? card.colorways[0];
  if (!active) return null;
  const href = `/product/${card.slug}?color=${active.slug}`;
  const ink = tone === "light";

  return (
    <article className="group relative">
      <div className="stage relative aspect-[4/5] overflow-hidden">
        <Link href={href} className="absolute inset-0 z-[1]" aria-label={`${card.name}, ${active.name}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={active.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-slow ease-tide group-hover:scale-[1.04]" />
          <span className="card-sheen pointer-events-none absolute inset-0 z-[2]" aria-hidden="true" />
        </Link>
        <div className="pointer-events-none absolute left-3 top-3 z-[2] flex flex-col gap-1">
          {card.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
        <div className="absolute bottom-3 right-3 z-[2]">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-pill bg-abyss/80 font-mono text-eyebrow text-foam"
            aria-label={`Add ${card.name} to bag`}
            onClick={() => setOpen((value) => !value)}
          >
            +
          </button>
        </div>
        {open ? (
          <div className="absolute inset-x-3 bottom-14 z-[3] border border-hairline bg-trench p-3">
            <p className="font-mono text-eyebrow uppercase text-mist">UK size</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {active.sizes.map((size) => (
                <button
                  key={size.variantId}
                  type="button"
                  disabled={size.available <= 0}
                  className="h-9 min-w-9 rounded-pill border border-hairline px-2 font-mono text-size disabled:text-mist disabled:line-through"
                  onClick={(event) => {
                    const stage = event.currentTarget.closest("article")?.querySelector("img");
                    const from = stage?.getBoundingClientRect();
                    void add(size.variantId, 1, from ? { image: active.image, from } : undefined);
                    setOpen(false);
                  }}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <Link href={href} className={cn("font-body font-medium", ink && "text-ink-on-porcelain")}>
            {card.name}
          </Link>
          <p className={cn("font-mono text-size text-mist", ink && "text-ink-on-porcelain/60")}>
            {card.category} · {card.colorways.length} {card.colorways.length === 1 ? "colour" : "colours"}
          </p>
        </div>
        <Price paise={active.pricePaise} mrpPaise={active.mrpPaise} className={ink ? "[&_span]:text-ink-on-porcelain" : undefined} />
      </div>
      {card.colorways.length > 1 ? (
        <div className="mt-3 flex gap-2">
          {card.colorways.map((item) => (
            <button
              key={item.slug}
              type="button"
              aria-label={`Colour: ${item.name}`}
              aria-pressed={item.slug === active.slug}
              className={cn("h-4 w-4 rounded-pill border", item.slug === active.slug ? "border-aqua" : "border-hairline")}
              style={{ background: `rgb(var(--swatch-${item.swatch}))` }}
              onClick={() => setColor(item.slug)}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}
