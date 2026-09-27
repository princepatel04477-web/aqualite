"use client";

import { useEffect } from "react";
import { motion, useMotionValue } from "motion/react";

import type { HeroSlide } from "@/lib/commerce/types";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion/tokens";

/**
 * Sleek carousel pagination: pill indicators with real-time autoplay progress,
 * direct slide selection, keyboard tablist support, and active slide caption.
 * Replaces the large product thumbnail rail with a clean, focused carousel control.
 */
export function HeroCarouselPagination({
  slides,
  activeIndex,
  onSelect,
  onPrev,
  onNext,
  onProgress,
  compact = false,
}: {
  slides: HeroSlide[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onProgress?: (listener: (value: number) => void) => () => void;
  compact?: boolean;
}) {
  const progress = useMotionValue(0);

  useEffect(() => {
    if (!onProgress) return;
    return onProgress((value) => progress.set(value));
  }, [onProgress, progress]);

  const activeSlide = slides[activeIndex];

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Pill indicators + optional directional controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onPrev ? (
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous slide"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline/80 bg-abyss/60 text-mist backdrop-blur-sm transition-all duration-quick hover:border-aqua hover:bg-abyss/90 hover:text-foam active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-aqua"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : null}

        <div
          role="tablist"
          aria-label="Carousel slides"
          className="flex items-center gap-2 rounded-full border border-hairline/60 bg-abyss/60 px-3 py-1.5 backdrop-blur-md"
        >
          {slides.map((slide, index) => {
            const active = index === activeIndex;
            return (
              <button
                key={slide.id}
                id={`hero-carousel-tab-${index}`}
                role="tab"
                aria-selected={active}
                aria-controls={`hero-scene-${index}`}
                aria-label={`Go to slide ${index + 1}: ${slide.product.name}`}
                tabIndex={active ? 0 : -1}
                onClick={() => onSelect(index)}
                className="group relative flex h-6 items-center justify-center px-1 focus-visible:outline-none"
              >
                <div
                  className={cn(
                    "relative h-1.5 overflow-hidden rounded-full transition-all duration-slow ease-tide",
                    active
                      ? compact
                        ? "w-8 bg-foam/25"
                        : "w-12 bg-foam/25"
                      : "w-2.5 bg-hairline group-hover:w-4 group-hover:bg-mist",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="hero-carousel-progress"
                      className="absolute inset-0 origin-left bg-aqua"
                      style={{ scaleX: progress }}
                      transition={{ type: "spring", ...spring.soft }}
                    />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {onNext ? (
          <button
            type="button"
            onClick={onNext}
            aria-label="Next slide"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline/80 bg-abyss/60 text-mist backdrop-blur-sm transition-all duration-quick hover:border-aqua hover:bg-abyss/90 hover:text-foam active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-aqua"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : null}
      </div>

      {/* Active product label under the pagination */}
      {activeSlide ? (
        <p
          aria-hidden="true"
          className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.16em] text-mist"
        >
          <span className="text-aqua font-medium">{String(activeIndex + 1).padStart(2, "0")}</span>
          <span className="mx-2 text-hairline">/</span>
          <span className="text-foam">{activeSlide.product.name}</span>
          <span className="mx-1.5 text-mist/60">·</span>
          <span className="text-mist/80">{activeSlide.product.colorwayName}</span>
        </p>
      ) : null}
    </div>
  );
}
