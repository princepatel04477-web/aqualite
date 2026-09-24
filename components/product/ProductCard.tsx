"use client";

import Link from "next/link";
import { useState } from "react";

import { QuickAddSheet } from "@/components/product/QuickAddSheet";
import { WishlistHeart } from "@/components/product/WishlistHeart";
import { useCart } from "@/components/cart/CartProvider";
import { Price } from "@/components/ui/Price";
import { Tag } from "@/components/ui/Tag";
import { useIsMobile } from "@/lib/mobile/useIsMobile";
import { swatchDots } from "@/lib/catalog/swatches";
import type { ProductCardModel } from "@/lib/commerce/types";
import { cn } from "@/lib/cn";

/**
 * Touch product card (M07): no hover-dependent content on touch (sheen
 * and zoom sit behind `hoverable:`), a real 44px quick-add hit opening
 * a size bottom sheet, colour dots with 44px hits (max 3 + "+N") that
 * swap the image in place, a 44px save heart, and a stacked text block
 * sized from tokens (name 15px 2-line clamp, mono meta, price row with
 * MRP struck + % off). The whole stage stays a link; desktop behaviour
 * (hover zoom, sheen, inline size popover) is unchanged.
 */
export function ProductCard({
  card,
  tone = "dark",
}: {
  card: ProductCardModel;
  tone?: "dark" | "light";
}) {
  const { add } = useCart();
  const isMobile = useIsMobile();
  const [color, setColor] = useState(card.colorwaySlug);
  const [open, setOpen] = useState(false);
  const active =
    card.colorways.find((item) => item.slug === color) ?? card.colorways[0];
  if (!active) return null;
  const href = `/product/${card.slug}?color=${active.slug}`;
  const ink = tone === "light";
  const dots = swatchDots(card.colorways);

  return (
    <article className="group relative">
      <div className="stage relative aspect-[4/5] overflow-hidden">
        <Link
          href={href}
          className="absolute inset-0 z-[1]"
          aria-label={`${card.name}, ${active.name}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-slow ease-tide hoverable:group-hover:scale-[1.04]"
          />
          <span
            className="card-sheen pointer-events-none absolute inset-0 z-[2] hidden hoverable:block"
            aria-hidden="true"
          />
        </Link>
        <div className="pointer-events-none absolute left-3 top-3 z-[2] flex flex-col items-start gap-1">
          {card.tags.map((tag) => (
            <Tag
              key={tag}
              className="rounded-pill bg-abyss/60 px-2 py-1 text-tag"
            >
              {tag}
            </Tag>
          ))}
        </div>
        <div className="absolute right-1 top-1 z-[3]">
          <WishlistHeart
            productId={card.productId}
            colorwaySlug={active.slug}
            name={card.name}
          />
        </div>
        {card.soldOut ? null : (
          <div className="absolute bottom-1 right-1 z-[3]">
            <button
              type="button"
              className="grid h-11 w-11 place-items-center"
              aria-label={`Add ${card.name} to bag`}
              aria-haspopup="dialog"
              onClick={() => setOpen(true)}
            >
              <span className="grid h-10 w-10 place-items-center rounded-pill bg-abyss/80 font-mono text-eyebrow text-foam">
                +
              </span>
            </button>
          </div>
        )}
        {open && !isMobile ? (
          <div className="absolute inset-x-3 bottom-14 z-[3] border border-hairline bg-trench p-3">
            <p className="font-mono text-eyebrow uppercase text-mist">
              UK size
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {active.sizes.map((size) => (
                <button
                  key={size.variantId}
                  type="button"
                  disabled={size.available <= 0}
                  className="h-9 min-w-9 rounded-pill border border-hairline px-2 font-mono text-size disabled:text-mist disabled:line-through"
                  onClick={async (event) => {
                    const stage = event.currentTarget
                      .closest("article")
                      ?.querySelector("img");
                    const from = stage?.getBoundingClientRect();
                    await add(
                      size.variantId,
                      1,
                      from ? { image: active.image, from } : undefined,
                    );
                    setOpen(false);
                  }}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <QuickAddSheet
          open={open && isMobile}
          onClose={() => setOpen(false)}
          card={card}
          active={active}
        />
      </div>
      {/* Stacked text block on touch: name → meta → price row, so the
          price never fights the name for width at 360px. */}
      <div className="mt-3 lg:flex lg:items-start lg:justify-between lg:gap-3">
        <div className="min-w-0">
          <Link
            href={href}
            className={cn(
              "line-clamp-2 font-body text-cardName font-medium",
              ink && "text-ink-on-porcelain",
            )}
          >
            {card.name}
          </Link>
          <p
            className={cn(
              "mt-0.5 font-mono text-eyebrow uppercase text-mist",
              ink && "text-ink-on-porcelain/60",
            )}
          >
            {card.category} · {card.colorways.length}{" "}
            {card.colorways.length === 1 ? "colour" : "colours"}
          </p>
        </div>
        <Price
          paise={active.pricePaise}
          mrpPaise={active.mrpPaise}
          className={cn(
            "mt-1.5 lg:mt-0 lg:shrink-0 lg:justify-end",
            ink ? "[&_span]:text-ink-on-porcelain" : undefined,
          )}
        />
      </div>
      {card.colorways.length > 1 ? (
        <div className="mt-1.5 flex items-center gap-0.5">
          {dots.shown.map((item) => {
            const isActive = item.slug === active.slug;
            return (
              <button
                key={item.slug}
                type="button"
                aria-label={`Colour: ${item.name}`}
                aria-pressed={isActive}
                className="grid h-11 w-11 place-items-center"
                onClick={() => setColor(item.slug)}
              >
                <span
                  className={cn(
                    "block h-5 w-5 rounded-pill border",
                    isActive
                      ? "border-aqua ring-1 ring-aqua ring-offset-1 ring-offset-abyss"
                      : "border-hairline",
                  )}
                  style={{ background: `rgb(var(--swatch-${item.swatch}))` }}
                />
              </button>
            );
          })}
          {dots.extra > 0 ? (
            <span
              className={cn(
                "ml-1 font-mono text-size text-mist",
                ink && "text-ink-on-porcelain/60",
              )}
            >
              +{dots.extra}
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
