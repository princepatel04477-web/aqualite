"use client";

import { heroImage } from "@/lib/catalog/hero-image";
import type { HeroSlide } from "@/lib/commerce/types";
import { cn } from "@/lib/cn";

import { HeroCtas, type HeroCtaPair } from "@/components/home/hero/HeroCtas";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * Decorative scene layer (R03 Defect 1, 2, 9):
 * Lives in the upper-right shoe stage (cols 7–12 above Lead + CTAs).
 * Renders the faint tinted halo (10–14% opacity of --hero-glow) and soft
 * contact shadow in CSS behind the transparent shoe cutout.
 */
export function HeroSceneBackdrop({
  slide,
  index,
  active,
  shouldLoadImage,
  priority,
}: {
  slide: HeroSlide;
  index: number;
  active: boolean;
  shouldLoadImage: boolean;
  priority: boolean;
}) {
  const spec = heroImage(slide.imageDesktopPath, slide.imageMobilePath, "desktop");
  const imageWidth = spec.aspect ? Math.round(spec.aspect * 1000) : 1400;

  return (
    <div
      data-hero-shoe={index}
      aria-hidden="true"
      style={{ ["--hero-glow" as string]: slide.glowHex }}
      className={cn(
        "pointer-events-none absolute inset-0 transition-opacity duration-base ease-surface",
        active ? "opacity-100" : "opacity-0 invisible",
      )}
    >
      <div className="hero-scene-glow pointer-events-none absolute -inset-8 z-0" />
      <div className="hero-contact-shadow pointer-events-none absolute inset-x-[12%] bottom-2 z-0 h-16" />
      <div className="relative z-[1] flex h-full w-full items-center justify-center">
        <div data-float className="flex h-full w-full items-center justify-center">
          <div data-parallax className="flex h-full w-full items-center justify-center">
            <div data-shoe className="flex h-full w-full items-center justify-center">
              {(priority || shouldLoadImage) && spec.fallback ? (
                <picture className="flex h-full w-full items-center justify-center">
                  {spec.avifSrcSet ? <source type="image/avif" srcSet={spec.avifSrcSet} sizes={spec.sizes} /> : null}
                  {spec.webpSrcSet ? <source type="image/webp" srcSet={spec.webpSrcSet} sizes={spec.sizes} /> : null}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={spec.fallback}
                    alt={slide.imageAlt}
                    width={imageWidth}
                    height={1000}
                    loading="eager"
                    decoding={priority ? "sync" : "async"}
                    fetchPriority={priority ? "high" : "low"}
                    className="hero-shoe max-h-full max-w-[90%] object-contain"
                  />
                </picture>
              ) : (
                <div
                  data-hero-placeholder
                  className="hero-shoe h-full w-full opacity-0"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Content scene layer (R03 Defect 2, 3, 6):
 * - Left column (cols 1–6): text-only Eyebrow ("MONSOON '26") + Headline
 *   (max-width 11ch, clamped font size so no glyph ever reaches col 7).
 * - Right column (cols 7–12): dedicated top spacer for the shoe stage, with
 *   Lead (--ink-2, >= 4.5:1 contrast) + two CTAs strictly BELOW the shoe's
 *   bounding box.
 */
export function HeroSceneContent({
  slide,
  index,
  count,
  pairs,
  active,
}: {
  slide: HeroSlide;
  index: number;
  count: number;
  pairs: HeroCtaPair[];
  active: boolean;
}) {
  return (
    <div
      data-hero-content={index}
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${count}: ${slide.product.name}`}
      className={cn(
        "col-start-1 row-start-1 grid items-end gap-x-8 lg:grid-cols-12",
        "transition-opacity duration-base ease-surface",
        active ? "opacity-100" : "opacity-0 invisible",
      )}
    >
      <div className="lg:col-span-6 lg:pr-4">
        <div data-meta>
          <Eyebrow className="text-ink-2">
            <span data-hero-eyebrow-text>{slide.eyebrow}</span>
          </Eyebrow>
        </div>
        <h2
          data-hero-headline
          className="heading-display mt-3 max-w-[11ch] font-display text-[clamp(2.75rem,4.5vw,5.15rem)] font-normal leading-[0.94] tracking-[-0.02em] text-ink"
        >
          <span className="block overflow-hidden pb-1">
            <span data-line className="block">
              {slide.headline.before}
            </span>
          </span>
          <span className="block overflow-hidden pb-1">
            <span data-line className="block">
              <em>{slide.headline.italic}</em>
              {slide.headline.after}
            </span>
          </span>
        </h2>
      </div>
      <div data-meta className="lg:col-span-6 flex flex-col justify-end lg:pl-4">
        {/* Reserves the upper-right zone (cols 7–12) for the floating shoe so Lead + CTAs sit strictly below */}
        <div className="pointer-events-none h-[clamp(195px,32vh,295px)] w-full shrink-0" aria-hidden="true" />
        <p
          data-hero-lead
          className="mt-4 max-w-[38ch] text-[clamp(0.95rem,1.1vw,1.125rem)] leading-[1.45] text-ink-2"
        >
          {slide.lead}
        </p>
        <HeroCtas
          pairs={pairs}
          primary={slide.ctaPrimary.label}
          secondary={slide.ctaSecondary.label}
          primaryHref={slide.ctaPrimary.href}
          secondaryHref={slide.ctaSecondary.href}
          active={active}
        />
      </div>
    </div>
  );
}
