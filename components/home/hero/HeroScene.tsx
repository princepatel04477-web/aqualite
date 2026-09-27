"use client";

import { heroImage } from "@/lib/catalog/hero-image";
import type { HeroSlide } from "@/lib/commerce/types";
import { cn } from "@/lib/cn";

import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";

function pad(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/**
 * Decorative scene layer: per-slide glow (CSS variable from data), vignette
 * and the floating shoe. Lives in the absolute stacking frame behind content.
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
  const spec = priority ? null : heroImage(slide.imageDesktopPath, slide.imageMobilePath, "desktop");
  // Slide 1 keeps the exact approved markup (and LCP element): plain <img>, priority.
  const imageWidth = spec?.aspect ? Math.round(spec.aspect * 1000) : 1400;

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
      <div className="hero-scene-glow absolute inset-0" />
      <div className="hero-vignette absolute inset-0" />
      <div className="absolute inset-x-0 top-[4%] flex justify-center lg:top-[0%]">
        <div data-float className="w-[min(128vw,1180px)]">
          <div data-parallax className="w-full">
            <div data-shoe>
              {priority ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/catalog/hero-tide-slide.jpg"
                  alt={slide.imageAlt}
                  width={1400}
                  height={1000}
                  fetchPriority="high"
                  className="hero-shoe w-full"
                />
              ) : shouldLoadImage && spec?.fallback ? (
                <picture>
                  {spec.avifSrcSet ? <source type="image/avif" srcSet={spec.avifSrcSet} sizes={spec.sizes} /> : null}
                  {spec.webpSrcSet ? <source type="image/webp" srcSet={spec.webpSrcSet} sizes={spec.sizes} /> : null}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={spec.fallback}
                    alt={slide.imageAlt}
                    width={imageWidth}
                    height={1000}
                    loading="eager"
                    decoding="async"
                    fetchPriority="low"
                    className="hero-shoe w-full"
                  />
                </picture>
              ) : (
                <div
                  data-hero-placeholder
                  className="hero-shoe aspect-[1400/1000] w-full bg-cover bg-center opacity-0"
                  style={{ backgroundImage: `url(${slide.imageDesktopPath})` }}
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
 * Content scene layer: eyebrow + headline in the left 8 columns, lead + CTAs
 * in the right 4 — the approved hero's exact grid, stacked per scene in one
 * grid cell so switching never changes height (CLS 0). Inactive scenes are
 * made inert + aria-hidden by the showcase and carry the APG slide role.
 */
export function HeroSceneContent({
  slide,
  index,
  count,
  active,
}: {
  slide: HeroSlide;
  index: number;
  count: number;
  active: boolean;
}) {
  return (
    <div
      data-hero-content={index}
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${count}: ${slide.product.name}`}
      className={cn(
        "col-start-1 row-start-1 grid items-end gap-8 lg:grid-cols-12",
        "transition-opacity duration-base ease-surface",
        active ? "opacity-100" : "opacity-0 invisible",
      )}
    >
      <div className="lg:col-span-8">
        <div data-meta>
          <Eyebrow index={pad(index)} total="06">
            {slide.eyebrow}
          </Eyebrow>
        </div>
        <h2 data-hero-headline className="heading-display mt-4 font-display text-display font-normal text-foam">
          <span className="block overflow-hidden">
            <span data-line className="block">
              {slide.headline.before}
            </span>
          </span>
          <span className="block overflow-hidden">
            <span data-line className="block">
              <em>{slide.headline.italic}</em>
              {slide.headline.after}
            </span>
          </span>
        </h2>
      </div>
      <div data-meta className="lg:col-span-4 lg:pb-2">
        <p data-hero-lead className="max-w-measure text-lead text-mist">
          {slide.lead}
        </p>
        <div data-hero-ctas className="mt-6 flex flex-wrap items-center gap-3">
          <Button href={slide.ctaPrimary.href} variant="primary" tabIndex={active ? undefined : -1}>
            {slide.ctaPrimary.label}
          </Button>
          <Button href={slide.ctaSecondary.href} variant="outline" tabIndex={active ? undefined : -1}>
            {slide.ctaSecondary.label}
          </Button>
        </div>
      </div>
    </div>
  );
}
