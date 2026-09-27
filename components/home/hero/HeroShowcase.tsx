"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useGSAP } from "@gsap/react";

import { createSceneTransition } from "@/components/home/hero/transitions/createSceneTransition";
import { WaveClipDef } from "@/components/home/hero/transitions/waveWipe";
import { HeroLiveRegion } from "@/components/home/hero/HeroLiveRegion";
import { HeroSceneBackdrop, HeroSceneContent } from "@/components/home/hero/HeroScene";
import { useHeroController } from "@/components/home/hero/useHeroController";
import { TideField } from "@/components/motion/TideField";
import { RollingDigits } from "@/components/motion/RollingDigits";
import type { HeroSlide } from "@/lib/commerce/types";
import { gsap } from "@/lib/motion/gsap";
import { whenIntroDone } from "@/lib/motion/intro";
import { duration, ease, gsapEase, stagger } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";
import { cn } from "@/lib/cn";

/**
 * The n-piece hero showcase: server-renders slide 01 exactly like the
 * approved hero (LCP untouched), stacks scenes 02–n as data, owns the APG
 * carousel semantics, autoplay, keyboard input and the pause control.
 * Scene changes run the H04 GSAP timeline; the price block swaps with
 * Motion presence per the animation-ownership table.
 */
export function HeroShowcase({
  slides,
  edit,
}: {
  slides: HeroSlide[];
  edit: { href: string; name: string; image: string; price: string }[];
}) {
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

  if (slides.length === 0) return null;
  const active = slides[hero.activeIndex] ?? slides[0];
  if (!active) return null;
  const productHref = `/product/${active.product.slug}?color=${active.product.colorwaySlug}`;

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
              active={index === hero.activeIndex}
            />
          ))}
        </div>

        <div data-hero-band className="mt-8 flex flex-col gap-6 border-t border-hairline pt-5 sm:flex-row sm:items-end sm:justify-between">
          <Link href={productHref} data-meta className="group">
            <p className="font-mono text-eyebrow uppercase text-aqua">
              <span className="block overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={active.product.name}
                    initial={{ y: "110%" }}
                    animate={{ y: "0%" }}
                    exit={{ y: "-110%" }}
                    transition={{ duration: duration.base, ease: ease.tide }}
                    className="block"
                  >
                    {active.product.name}
                  </motion.span>
                </AnimatePresence>
              </span>
            </p>
            <p className="mt-1 font-body text-h3 tabular text-foam transition-colors duration-quick ease-tide group-hover:text-sand">
              ₹<RollingDigits value={Math.round(active.product.pricePaise / 100)} />
            </p>
          </Link>
          <ul data-meta className="flex gap-3">
            {edit.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="group block w-16 sm:w-20">
                  <span className="stage block aspect-[4/5] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-slow ease-tide group-hover:scale-105"
                    />
                  </span>
                  <span className="mt-2 block truncate font-mono text-eyebrow uppercase text-mist group-hover:text-foam">
                    {item.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div data-meta className="flex items-center gap-4 font-mono text-eyebrow uppercase text-mist">
            <button
              type="button"
              onClick={hero.togglePlay}
              aria-pressed={hero.playPaused}
              aria-label={hero.playPaused ? "Play autoplay" : "Pause autoplay"}
              className={cn(
                "-my-3 min-h-11 min-w-11 px-2 font-mono text-eyebrow uppercase transition-colors duration-quick ease-tide",
                hero.playPaused ? "text-aqua" : "text-mist hover:text-foam",
              )}
            >
              {hero.playPaused ? "Play" : "Pause"}
            </button>
            <span className="hidden sm:inline">Scroll</span>
            <span className="relative hidden h-12 w-px overflow-hidden bg-hairline sm:block">
              <span data-scroll-line className="absolute inset-x-0 top-0 h-1/2 bg-aqua" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
