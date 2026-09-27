"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue } from "motion/react";

import { preloadHeroImage } from "@/lib/catalog/hero-image";
import type { HeroSlide } from "@/lib/commerce/types";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion/tokens";

/**
 * Thumbnail rail (H05): one porcelain thumb per scene, tablist semantics,
 * shared-layout active indicator with the autoplay progress line, hover
 * ripple and 250ms hover preload. No truncated labels anywhere.
 */
export function HeroThumbRail({
  slides,
  activeIndex,
  onSelect,
  onProgress,
}: {
  slides: HeroSlide[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onProgress?: (listener: (value: number) => void) => () => void;
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
    <div
      role="tablist"
      aria-label="Featured scenes"
      data-meta
      className="flex items-end gap-3 overflow-x-auto py-1 sm:gap-4 xl:gap-6"
      style={{ scrollSnapType: "x proximity" }}
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
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(index)}
            onMouseEnter={() => onEnter(index)}
            onMouseLeave={onLeave}
            className={cn(
              "hero-thumb group relative block shrink-0 cursor-pointer pb-7 text-left",
              hovered === index ? "hero-thumb-hover" : "",
            )}
          >
            <motion.span
              className="stage relative block aspect-[4/5] w-[120px] overflow-hidden xl:w-[160px]"
              animate={{
                y: active ? -8 : 0,
                opacity: active ? 1 : hovered === index ? 0.85 : 0.55,
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
            <span className="absolute inset-x-0 bottom-0 left-0">
              <span className="block whitespace-nowrap font-mono text-[11px] uppercase leading-4 tracking-[0.14em] text-mist transition-colors duration-quick ease-tide group-hover:text-foam">
                {slide.product.name}
              </span>
              <span className="block whitespace-nowrap font-mono text-[11px] uppercase leading-4 tracking-[0.14em] text-mist/70">
                {slide.product.colorwayName}
              </span>
            </span>
            {active ? (
              <motion.span
                layoutId="hero-thumb-indicator"
                className="absolute inset-x-0 bottom-[calc(2rem-2px)] block h-[2px] bg-aqua"
                transition={{ type: "spring", ...spring.soft }}
              >
                <motion.span
                  aria-hidden="true"
                  className="block h-full w-full origin-left bg-aqua"
                  style={{ scaleX: progress }}
                />
              </motion.span>
            ) : (
              <span aria-hidden="true" className="absolute inset-x-0 bottom-[calc(2rem-2px)] block h-[2px] bg-hairline" />
            )}
          </button>
        );
      })}
    </div>
  );
}
