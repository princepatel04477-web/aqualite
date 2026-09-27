"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { HeroCarouselPagination } from "@/components/home/hero/HeroCarouselPagination";
import { HeroCounter } from "@/components/home/hero/HeroCounter";
import { type HeroCtaPair } from "@/components/home/hero/HeroCtas";
import { HeroLiveRegion } from "@/components/home/hero/HeroLiveRegion";
import { HeroMobileScene } from "@/components/home/hero/HeroMobileScene";
import { HeroPriceBlock } from "@/components/home/hero/HeroPriceBlock";
import { HeroSceneBackdrop, HeroSceneContent } from "@/components/home/hero/HeroScene";
import {
  HERO_AUTOPLAY_MS,
  HERO_AUTOPLAY_MS_MOBILE,
} from "@/components/home/hero/heroMachine";
import { useHeroController } from "@/components/home/hero/useHeroController";
import { TideField } from "@/components/motion/TideField";
import type { HeroSlide } from "@/lib/commerce/types";

// Desktop-only motion engine: its chunk (with GSAP) is fetched on demand and
// never on touch/mobile layouts (H06 showcase JS budget).
const HeroDesktopEngine = dynamic(() => import("./HeroDesktopEngine").then((m) => m.HeroDesktopEngine), {
  ssr: false,
  loading: () => null,
});

const MOBILE_QUERY = "(max-width: 1023px)";

/**
 * The n-piece hero showcase shell: server-renders slide 01 exactly like the
 * approved hero (LCP untouched), stacks scenes 02–n as data, owns the APG
 * carousel semantics, autoplay, keyboard input and the pause control.
 * The layout below 1024px (or a mobile user agent at SSR) is the H06 stacked
 * mobile scene with Motion-only transitions; the GSAP desktop engine mounts
 * lazily beside the static desktop tree.
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

  // The user agent decides the SSR tree; media queries take over after mount.
  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const sync = (): void => setMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // inert + aria-hidden on inactive scenes (React 18 has no inert prop).
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
        className="relative -mt-[calc(var(--header-h)+2rem)] flex min-h-[100dvh] flex-col overflow-hidden bg-abyss"
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
      className="relative -mt-[calc(var(--header-h)+2rem)] flex min-h-[100dvh] flex-col justify-end overflow-hidden bg-abyss"
    >
      <h1 className="sr-only">Aqualite — footwear for the monsoon</h1>
      <HeroLiveRegion announcement={hero.announcement} />
      <div data-hero-ripples className="absolute inset-0">
        <TideField className="h-full w-full" />
      </div>

      <div data-hero-scroll className="pointer-events-none absolute inset-0">
        <div data-hero-scenes className="absolute inset-0">
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

      {/* Floating carousel navigation arrows */}
      <div className="pointer-events-none absolute inset-y-0 inset-x-0 z-[10] flex items-center justify-between px-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={hero.prev}
          aria-label="Previous slide"
          className="pointer-events-auto group flex h-11 w-11 lg:h-12 lg:w-12 items-center justify-center rounded-full border border-hairline/80 bg-abyss/60 text-foam backdrop-blur-md transition-all duration-quick hover:border-aqua hover:bg-abyss/90 hover:text-aqua hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua"
        >
          <svg className="h-5 w-5 transition-transform duration-quick group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          type="button"
          onClick={hero.next}
          aria-label="Next slide"
          className="pointer-events-auto group flex h-11 w-11 lg:h-12 lg:w-12 items-center justify-center rounded-full border border-hairline/80 bg-abyss/60 text-foam backdrop-blur-md transition-all duration-quick hover:border-aqua hover:bg-abyss/90 hover:text-aqua hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua"
        >
          <svg className="h-5 w-5 transition-transform duration-quick group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="relative z-[2] page-wrap pb-8 lg:pb-10">
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

        <div data-hero-band className="mt-8 grid grid-cols-2 items-end gap-6 border-t border-hairline pt-5 lg:grid-cols-[auto_1fr_auto]">
          <HeroPriceBlock slide={active} />
          <div className="col-span-2 order-3 lg:order-none lg:col-span-1 flex lg:justify-center">
            <HeroCarouselPagination
              slides={slides}
              activeIndex={hero.activeIndex}
              onSelect={hero.goTo}
              onPrev={hero.prev}
              onNext={hero.next}
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
