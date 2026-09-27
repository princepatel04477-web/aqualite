"use client";

import { useCallback, useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";

import { createSceneTransition } from "@/components/home/hero/transitions/createSceneTransition";
import { WaveClipDef } from "@/components/home/hero/transitions/waveWipe";
import { HeroCounter } from "@/components/home/hero/HeroCounter";
import { type HeroCtaPair } from "@/components/home/hero/HeroCtas";
import { HeroLiveRegion } from "@/components/home/hero/HeroLiveRegion";
import { HeroPriceBlock } from "@/components/home/hero/HeroPriceBlock";
import { HeroSceneBackdrop, HeroSceneContent } from "@/components/home/hero/HeroScene";
import { HeroThumbRail } from "@/components/home/hero/HeroThumbRail";
import { useHeroController } from "@/components/home/hero/useHeroController";
import { TideField } from "@/components/motion/TideField";
import type { HeroSlide } from "@/lib/commerce/types";
import { gsap } from "@/lib/motion/gsap";
import { whenIntroDone } from "@/lib/motion/intro";
import { duration, gsapEase, stagger } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

/**
 * The n-piece hero showcase: server-renders slide 01 exactly like the
 * approved hero (LCP untouched), stacks scenes 02–n as data, owns the APG
 * carousel semantics, autoplay, keyboard input and the pause control.
 * Scene changes run the H04 GSAP timeline; the price block swaps with
 * Motion presence per the animation-ownership table.
 */
export function HeroShowcase({ slides }: { slides: HeroSlide[] }) {
  const root = useRef<HTMLElement>(null);
  const { allowCursorFX, allowPinning, reduced, tier } = useMotionPolicy();
  const hero = useHeroController(slides);
  const activeIndexRef = useRef(hero.activeIndex);
  activeIndexRef.current = hero.activeIndex;
  const floatTween = useRef<gsap.core.Tween | null>(null);
  const completeRef = useRef(hero.complete);
  completeRef.current = hero.complete;

  // Buoyancy idle float on exactly one shoe — started by handover or idle state.
  const startFloat = useCallback(
    (index: number) => {
      floatTween.current?.kill();
      const node = root.current;
      const target = node?.querySelector(`[data-hero-shoe="${index}"] [data-float]`);
      if (!target) return;
      gsap.killTweensOf(target);
      floatTween.current = gsap.to(target, {
        y: 12,
        rotate: 1.4,
        duration: duration.cinematic * 2,
        yoyo: true,
        repeat: -1,
        ease: gsapEase.drift,
        delay: duration.cinematic,
      });
    },
    [],
  );

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
  }, [hero.activeIndex, slides.length]);

  // H04: run the scene-change timeline whenever the machine starts one.
  const stepKey = hero.lastStep ? `${hero.lastStep.from}-${hero.lastStep.to}-${hero.direction}` : "none";
  const isTransitioning = hero.isTransitioning;
  useEffect(() => {
    const node = root.current;
    const step = hero.lastStep;
    if (!node || !step || !isTransitioning) return;
    const fromSlide = slides[step.from];
    const toSlide = slides[step.to];
    if (!fromSlide || !toSlide) return;

    const transition = createSceneTransition({
      root: node,
      from: step.from,
      to: step.to,
      direction: step.direction,
      policy: { tier, reduced },
      slides: {
        from: { eyebrow: fromSlide.eyebrow, glowHex: fromSlide.glowHex },
        to: { eyebrow: toSlide.eyebrow, glowHex: toSlide.glowHex },
      },
      onFloatHandover: startFloat,
      onSettled: (index) => completeRef.current(index),
    });
    transition.timeline.play();
    return () => {
      // Interrupted: jump the old timeline to its end state, then start fresh.
      transition.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, isTransitioning, tier, reduced, startFloat]);

  // While idle (no transition running), the float lives on the active shoe.
  useEffect(() => {
    if (isTransitioning) return;
    if (reduced) return;
    startFloat(hero.activeIndex);
    return () => {
      floatTween.current?.kill();
    };
  }, [hero.activeIndex, isTransitioning, reduced, startFloat]);

  useGSAP(
    () => {
      const node = root.current;
      if (!node || reduced) return;

      // First-load choreography: slide 01 only, unchanged from the approved hero.
      const firstShoe = node.querySelector('[data-hero-shoe="0"] [data-shoe]');
      const firstLines = node.querySelectorAll('[data-hero-content="0"] [data-line]');
      const firstMeta = node.querySelectorAll('[data-hero-content="0"] [data-meta], [data-hero-band] [data-meta]');
      const meter = node.querySelector("[data-scroll-line]");

      const intro = gsap.timeline({ paused: true });
      intro.from(firstShoe, { y: 64, scale: 1.08, opacity: 0, duration: duration.cinematic, ease: gsapEase.tide }, 0);
      intro.from(firstLines, { yPercent: 110, duration: duration.slow, stagger: stagger.loose, ease: gsapEase.tide }, 0.15);
      intro.from(firstMeta, { y: 20, opacity: 0, duration: duration.base, stagger: stagger.base, ease: gsapEase.tide }, 0.4);
      const stopWait = whenIntroDone(() => intro.play());
      const fallbackTimer = window.setTimeout(() => intro.play(), 2800);

      // Cursor parallax on the active shoe stack.
      let onMove: ((event: PointerEvent) => void) | null = null;
      if (allowCursorFX) {
        const quick: { xTo: gsap.QuickToFunc; yTo: gsap.QuickToFunc }[] = [];
        for (let index = 0; index < slides.length; index += 1) {
          const parallax = node.querySelector(`[data-hero-shoe="${index}"] [data-parallax]`);
          if (parallax) {
            quick.push({
              xTo: gsap.quickTo(parallax, "x", { duration: duration.base, ease: gsapEase.tide }),
              yTo: gsap.quickTo(parallax, "y", { duration: duration.base, ease: gsapEase.tide }),
            });
          }
        }
        onMove = (event: PointerEvent) => {
          const rect = node.getBoundingClientRect();
          const px = (event.clientX - rect.left) / rect.width - 0.5;
          const py = (event.clientY - rect.top) / rect.height - 0.5;
          const pair = quick[activeIndexRef.current];
          pair?.xTo(px * 36);
          pair?.yTo(py * 18);
        };
        node.addEventListener("pointermove", onMove);
      }

      const scrollLayer = node.querySelector("[data-hero-scroll]");
      const scrub =
        allowPinning && scrollLayer
          ? gsap.to(scrollLayer, {
              y: -120,
              ease: gsapEase.linear,
              scrollTrigger: { trigger: node, start: "top top", end: "bottom top", scrub: true },
            })
          : null;

      const meterTween = meter
        ? gsap.fromTo(
            meter,
            { yPercent: -120 },
            { yPercent: 140, duration: duration.cinematic, repeat: -1, ease: gsapEase.linear },
          )
        : null;

      return () => {
        stopWait();
        window.clearTimeout(fallbackTimer);
        intro.kill();
        scrub?.scrollTrigger?.kill();
        scrub?.kill();
        meterTween?.kill();
        if (onMove) node.removeEventListener("pointermove", onMove);
      };
    },
    { scope: root, dependencies: [allowCursorFX, allowPinning, reduced, slides.length] },
  );

  const ctaPairs: HeroCtaPair[] = slides.map((slide) => ({
    primary: slide.ctaPrimary.label,
    secondary: slide.ctaSecondary.label,
  }));
  if (slides.length === 0) return null;
  const active = slides[hero.activeIndex] ?? slides[0];
  if (!active) return null;
  void active;

  return (
    <section
      ref={root}
      data-hero-root
      data-header="transparent"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured footwear"
      onKeyDown={hero.onKeyDown}
      className="relative -mt-[calc(var(--header-h)+2rem)] flex min-h-[100dvh] flex-col justify-end overflow-hidden bg-abyss"
    >
      <h1 className="sr-only">Aqualite — footwear for the monsoon</h1>
      <HeroLiveRegion announcement={hero.announcement} />
      <WaveClipDef />
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
    </section>
  );
}
