"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";

import { HeroLiveRegion } from "@/components/home/hero/HeroLiveRegion";
import { HeroSceneBackdrop, HeroSceneContent } from "@/components/home/hero/HeroScene";
import { useHeroController } from "@/components/home/hero/useHeroController";
import { TideField } from "@/components/motion/TideField";
import type { HeroSlide } from "@/lib/commerce/types";
import { gsap } from "@/lib/motion/gsap";
import { whenIntroDone } from "@/lib/motion/intro";
import { duration, gsapEase, stagger } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/money";

/**
 * The n-piece hero showcase (H03): server-renders slide 01 exactly like the
 * approved hero (LCP untouched), stacks scenes 02–n as data, owns the APG
 * carousel semantics, autoplay, keyboard input and the pause control.
 * Scene-change choreography arrives with H04 — scenes crossfade for now.
 */
export function HeroShowcase({
  slides,
  edit,
}: {
  slides: HeroSlide[];
  edit: { href: string; name: string; image: string; price: string }[];
}) {
  const root = useRef<HTMLElement>(null);
  const { allowCursorFX, allowPinning, reduced } = useMotionPolicy();
  const hero = useHeroController(slides);
  const activeIndexRef = useRef(hero.activeIndex);
  activeIndexRef.current = hero.activeIndex;

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

  // Buoyancy idle float on exactly one shoe — the active scene's.
  useEffect(() => {
    if (reduced) return;
    const node = root.current;
    if (!node) return;
    const target = node.querySelector(`[data-hero-shoe="${hero.activeIndex}"] [data-float]`);
    if (!target) return;
    const tween = gsap.to(target, {
      y: 12,
      rotate: 1.4,
      duration: duration.cinematic * 2,
      yoyo: true,
      repeat: -1,
      ease: gsapEase.drift,
      delay: duration.cinematic,
    });
    return () => {
      tween.kill();
    };
  }, [hero.activeIndex, reduced]);

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
      <TideField className="absolute inset-0 h-full w-full" />

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
            <p className="font-mono text-eyebrow uppercase text-aqua">{active.product.name}</p>
            <p className="mt-1 font-body text-h3 tabular text-foam transition-colors duration-quick ease-tide group-hover:text-sand">
              {formatINR(active.product.pricePaise)}
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
