"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue } from "motion/react";

import { preloadHeroImage } from "@/lib/catalog/hero-image";
import type { HeroSlide } from "@/lib/commerce/types";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion/tokens";

/**
 * Thumbnail rail (H05 desktop, H06 compact mobile, R03 Defect 5 & 9):
 * 5 porcelain thumbs with full product names (never truncated), active thumb
 * red progress line. Sized to fit comfortably in 1024..1920 and 100svh.
 */
export function HeroThumbRail({
  slides,
  activeIndex,
  onSelect,
  onProgress,
  compact = false,
}: {
  slides: HeroSlide[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onProgress?: (listener: (value: number) => void) => () => void;
  compact?: boolean;
}) {
  const progress = useMotionValue(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const hoverTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!onProgress) return;
    return onProgress((value) => progress.set(value));
  }, [onProgress, progress]);

  useEffect(
    () => () => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    },
    [],
  );

  const onEnter = (index: number): void => {
    if (compact) return;
    setHovered(index);
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      const slide = slides[index];
      if (slide) preloadHeroImage(slide.imageDesktopPath, slide.imageMobilePath);
    }, 250);
  };

  const onLeave = (): void => {
    setHovered(null);
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
  };

  return (
    <div data-hero-thumb-rail>
      <div
        role="tablist"
        aria-label="Featured scenes"
        data-meta
        className={cn(
          "flex items-end py-1 no-scrollbar",
          compact ? "w-full justify-between gap-2" : "gap-2 xl:gap-3.5",
        )}
      >
        {slides.map((slide, index) => {
          const active = index === activeIndex;
          return (
            <button
              key={slide.id}
              id={`hero-tab-${index}`}
              role="tab"
              aria-selected={active}
              aria-controls={`hero-scene-${index}`}
              aria-label={`${slide.product.name} · ${slide.product.colorwayName}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(index)}
              onMouseEnter={() => onEnter(index)}
              onMouseLeave={compact ? undefined : onLeave}
              className={cn(
                "hero-thumb group relative block shrink-0 cursor-pointer text-left",
                compact ? "flex-1 pb-2" : "w-[96px] xl:w-[110px] 2xl:w-[118px] pb-9",
                hovered === index ? "hero-thumb-hover" : "",
              )}
            >
              <motion.span
                className={cn(
                  "stage relative block overflow-hidden border border-hairline",
                  compact ? "aspect-[4/3] w-full" : "aspect-[16/10] w-full",
                )}
                animate={{
                  y: active ? (compact ? -2 : -4) : 0,
                  opacity: active ? 1 : hovered === index ? 0.9 : 0.68,
                }}
                transition={active ? { type: "spring", ...spring.soft } : { duration: 0.24, ease: "easeOut" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.product.thumbnail}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-slow ease-tide group-hover:scale-105"
                />
                <span aria-hidden="true" className="thumb-ripple pointer-events-none absolute inset-0" />
              </motion.span>
              {compact ? null : (
                <span className="absolute inset-x-0 bottom-0 left-0">
                  <span
                    data-thumb-name
                    className={cn(
                      "block whitespace-nowrap font-mono text-[10px] xl:text-[11px] uppercase leading-4 tracking-[0.04em] xl:tracking-[0.08em] transition-colors duration-quick ease-tide",
                      active ? "font-medium text-ink" : "text-ink-2 group-hover:text-ink",
                    )}
                  >
                    {slide.product.name}
                  </span>
                  <span className="block whitespace-nowrap font-mono text-[9px] xl:text-[10px] uppercase leading-3.5 tracking-[0.02em] xl:tracking-[0.06em] text-muted">
                    {slide.product.colorwayName}
                  </span>
                </span>
              )}
              {active ? (
                <motion.span
                  layoutId="hero-thumb-indicator"
                  className={cn(
                    "absolute inset-x-0 block h-[2px] bg-red/25",
                    compact ? "bottom-0" : "bottom-[2.1rem]",
                  )}
                  transition={{ type: "spring", ...spring.soft }}
                >
                  <motion.span
                    aria-hidden="true"
                    className="block h-full w-full origin-left bg-red"
                    style={{ scaleX: progress }}
                  />
                </motion.span>
              ) : (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-0 block h-[2px] bg-hairline",
                    compact ? "bottom-0" : "bottom-[2.1rem]",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
      {compact ? (
        <p
          data-thumb-active-name
          aria-hidden="true"
          className="mt-1.5 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.12em] text-ink-2"
        >
          {slides[activeIndex]?.product.name} · {slides[activeIndex]?.product.colorwayName}
        </p>
      ) : null}
    </div>
  );
}
