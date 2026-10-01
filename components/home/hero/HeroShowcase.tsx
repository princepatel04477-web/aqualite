"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { HeroCounter } from "@/components/home/hero/HeroCounter";
import { type HeroCtaPair } from "@/components/home/hero/HeroCtas";
import { HeroLiveRegion } from "@/components/home/hero/HeroLiveRegion";
import { HeroMobileScene } from "@/components/home/hero/HeroMobileScene";
import { HeroPriceBlock } from "@/components/home/hero/HeroPriceBlock";
import { HeroSceneBackdrop, HeroSceneContent } from "@/components/home/hero/HeroScene";
import { HeroThumbRail } from "@/components/home/hero/HeroThumbRail";
import {
  HERO_AUTOPLAY_MS,
  HERO_AUTOPLAY_MS_MOBILE,
} from "@/components/home/hero/heroMachine";
import { useHeroController } from "@/components/home/hero/useHeroController";
import { TideField } from "@/components/motion/TideField";
import type { HeroSlide } from "@/lib/commerce/types";

const HeroDesktopEngine = dynamic(() => import("./HeroDesktopEngine").then((m) => m.HeroDesktopEngine), {
  ssr: false,
  loading: () => null,
});

const MOBILE_QUERY = "(max-width: 1023px)";

/**
 * The n-piece hero showcase shell (R03 fixes):
 * - Light ivory surface with CSS halo + contact shadow
 * - Headline in cols 1–6 (max 11ch), Shoe in upper cols 7–12, Lead + CTAs
 *   in lower cols 7–12 strictly below the shoe's bounding box
 * - Single navigation system: 5 porcelain thumbnails with full product names
 *   + active red progress line + single "04 / 05 · Pause · Scroll" group
 * - Fits in 100svh (min 720px) at 1440×900
 */
export function HeroShowcase({
  slides,
  initialMobile = false,
}: {
  slides: HeroSlide[];
  initialMobile?: boolean;
}) {
  const root = useRef<HTMLElement>(null);
  const [mobile, setMobile] = useState(initialMobile);
  const hero = useHeroController(slides, {
    autoplayMs: initialMobile ? HERO_AUTOPLAY_MS_MOBILE : HERO_AUTOPLAY_MS,
  });

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const sync = (): void => setMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    for (let index = 0; index < slides.length; index += 1) {
      const active = index === hero.activeIndex;
      for (const attribute of ["data-hero-content", "data-hero-shoe"]) {
        const found = node.querySelectorAll<HTMLElement>(`[${attribute}="${index}"]`);
        for (const element of found) {
          element.toggleAttribute("inert", !active);
          if (attribute === "data-hero-content") {
            element.setAttribute("aria-hidden", active ? "false" : "true");
          }
        }
      }
    }
  }, [hero.activeIndex, slides.length, mobile]);

  const ctaPairs: HeroCtaPair[] = slides.map((slide) => ({
    primary: slide.ctaPrimary.label,
    secondary: slide.ctaSecondary.label,
  }));
  if (slides.length === 0) return null;

  const shared = {
    "data-hero-root": true,
    "data-header": "transparent",
    role: "region",
    "aria-roledescription": "carousel",
    "aria-label": "Featured footwear",
  } as const;

  if (mobile) {
    return (
      <section
        {...shared}
        ref={root}
        onKeyDown={hero.onKeyDown}
        onTouchStart={hero.onTouchStart}
        onTouchEnd={hero.onTouchEnd}
        className="relative -mt-[calc(var(--header-h)+2rem)] flex min-h-[100svh] flex-col overflow-hidden bg-ivory"
      >
        <h1 className="sr-only">Aqualite — footwear for the monsoon</h1>
        <HeroLiveRegion announcement={hero.announcement} />
        <HeroMobileScene
          slides={slides}
          activeIndex={hero.activeIndex}
          isTransitioning={hero.isTransitioning}
          playPaused={hero.playPaused}
          onTogglePlay={hero.togglePlay}
          onSelect={hero.goTo}
          onNext={hero.next}
          onPrev={hero.prev}
          onComplete={hero.complete}
          onProgress={hero.onProgress}
        />
      </section>
    );
  }

  const active = slides[hero.activeIndex] ?? slides[0];
  if (!active) return null;

  return (
    <section
      {...shared}
      ref={root}
      onKeyDown={hero.onKeyDown}
      onTouchStart={hero.onTouchStart}
      onTouchEnd={hero.onTouchEnd}
      className="relative -mt-[calc(var(--header-h)+2rem)] flex h-[100svh] min-h-[720px] flex-col justify-between overflow-hidden bg-ivory pt-[calc(var(--header-h)+2.25rem)]"
    >
      <h1 className="sr-only">Aqualite — footwear for the monsoon</h1>
      <HeroLiveRegion announcement={hero.announcement} />
      <div data-hero-ripples className="pointer-events-none absolute inset-0">
        <TideField className="h-full w-full" />
      </div>

      <div className="relative z-[2] page-wrap flex flex-1 flex-col justify-between pb-5 lg:pb-6">
        <div className="relative flex flex-1 flex-col justify-center">
          {/* Upper-right shoe stage (cols 7–12, strictly above Lead + CTAs) */}
          <div
            data-hero-scroll
            className="pointer-events-none absolute right-0 top-0 left-[calc(50%+1rem)] h-[clamp(190px,31vh,290px)]"
          >
            <div data-hero-scenes className="relative h-full w-full">
              {slides.map((slide, index) => (
                <HeroSceneBackdrop
                  key={slide.id}
                  slide={slide}
                  index={index}
                  active={index === hero.activeIndex}
                  shouldLoadImage={hero.mountedImages.has(index)}
                  priority={index === 0}
                />
              ))}
            </div>
          </div>

          <div data-hero-copy className="grid-area-stack">
            {slides.map((slide, index) => (
              <HeroSceneContent
                key={slide.id}
                slide={slide}
                index={index}
                count={slides.length}
                pairs={ctaPairs}
                active={index === hero.activeIndex}
              />
            ))}
          </div>
        </div>

        <div
          data-hero-band
          className="mt-4 grid grid-cols-[auto_1fr_auto] items-end gap-4 border-t border-hairline pt-4"
        >
          <HeroPriceBlock slide={active} />
          <div className="flex justify-center">
            <HeroThumbRail
              slides={slides}
              activeIndex={hero.activeIndex}
              onSelect={hero.goTo}
              onProgress={hero.onProgress}
            />
          </div>
          <div className="justify-self-end">
            <HeroCounter
              activeIndex={hero.activeIndex}
              count={slides.length}
              playPaused={hero.playPaused}
              onTogglePlay={hero.togglePlay}
            />
          </div>
        </div>
      </div>

      <HeroDesktopEngine
        rootRef={root}
        slides={slides}
        activeIndex={hero.activeIndex}
        lastStep={hero.lastStep}
        isTransitioning={hero.isTransitioning}
        onComplete={hero.complete}
      />
    </section>
  );
}
