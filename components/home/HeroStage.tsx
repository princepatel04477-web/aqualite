"use client";

import Link from "next/link";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import { TideField } from "@/components/motion/TideField";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { whenIntroDone } from "@/lib/motion/intro";
import { duration, gsapEase, stagger } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

export type HeroThumb = {
  href: string;
  name: string;
  image: string;
  price: string;
};

export function HeroStage({
  eyebrow,
  lead,
  emphasis,
  rest,
  copy,
  price,
  productHref,
  edit,
}: {
  eyebrow: string;
  lead: string;
  emphasis: string;
  rest: string;
  copy: string;
  price: string;
  productHref: string;
  edit: HeroThumb[];
}) {
  const root = useRef<HTMLElement>(null);
  const { reduced, allowCursorFX, allowPinning, tier } = useMotionPolicy();

  useGSAP(
    () => {
      const node = root.current;
      // Desktop-only choreography (pin/scrub, cursor parallax, float, intro).
      // On mobile/touch the hero renders calm and static — no ScrollTrigger.
      if (!node || reduced || tier !== "high") return;
      const lines = node.querySelectorAll("[data-line]");
      const shoe = node.querySelector("[data-shoe]");
      const meta = node.querySelectorAll("[data-meta]");
      const float = node.querySelector("[data-float]");
      const parallax = node.querySelector("[data-parallax]");
      const scrollLayer = node.querySelector("[data-scroll]");
      const meter = node.querySelector("[data-scroll-line]");

      const tl = gsap.timeline({ paused: true });
      tl.from(shoe, { y: 64, scale: 1.08, opacity: 0, duration: duration.cinematic, ease: gsapEase.tide }, 0);
      tl.from(lines, { yPercent: 110, duration: duration.slow, stagger: stagger.loose, ease: gsapEase.tide }, 0.15);
      tl.from(meta, { y: 20, opacity: 0, duration: duration.base, stagger: stagger.base, ease: gsapEase.tide }, 0.4);

      const stopWait = whenIntroDone(() => tl.play());
      const fallback = window.setTimeout(() => tl.play(), 2800);

      const floatTween = float
        ? gsap.to(float, {
            y: 12,
            rotate: 1.4,
            duration: duration.cinematic * 2,
            yoyo: true,
            repeat: -1,
            ease: gsapEase.drift,
            delay: duration.cinematic,
          })
        : null;

      let onMove: ((event: PointerEvent) => void) | null = null;
      if (allowCursorFX && parallax) {
        const xTo = gsap.quickTo(parallax, "x", { duration: duration.base, ease: gsapEase.tide });
        const yTo = gsap.quickTo(parallax, "y", { duration: duration.base, ease: gsapEase.tide });
        onMove = (event: PointerEvent) => {
          const rect = node.getBoundingClientRect();
          const px = (event.clientX - rect.left) / rect.width - 0.5;
          const py = (event.clientY - rect.top) / rect.height - 0.5;
          xTo(px * 36);
          yTo(py * 18);
        };
        node.addEventListener("pointermove", onMove);
      }

      const scrub = allowPinning && scrollLayer
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
        window.clearTimeout(fallback);
        tl.kill();
        floatTween?.kill();
        scrub?.scrollTrigger?.kill();
        scrub?.kill();
        meterTween?.kill();
        if (onMove) node.removeEventListener("pointermove", onMove);
      };
    },
    { scope: root, dependencies: [allowCursorFX, allowPinning, reduced] },
  );

  return (
    <section
      ref={root}
      data-header="transparent"
      className="relative -mt-[calc(var(--header-h)+2rem)] flex min-h-[100svh] flex-col justify-end overflow-hidden bg-abyss"
    >
      <TideField className="absolute inset-0 h-full w-full" />
      <div className="hero-glow pointer-events-none absolute inset-0" />
      <div className="hero-vignette pointer-events-none absolute inset-0" />

      <div data-scroll className="pointer-events-none absolute inset-0">
        <div data-parallax className="absolute inset-x-0 top-[4%] flex justify-center lg:top-[0%]">
          <div data-float className="w-[min(128vw,1180px)]">
            <div data-shoe>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/catalog/hero-tide-slide.jpg"
                alt="Aqualite Tide Slide, black with an aqua strap, floating on dark water"
                width={1400}
                height={1000}
                fetchPriority="high"
                className="hero-shoe w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-[2] page-wrap pb-8 lg:pb-10">
        <div className="grid items-end gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div data-meta>
              <Eyebrow index="01" total="06">
                {eyebrow}
              </Eyebrow>
            </div>
            <h1 className="heading-display mt-4 font-display text-display font-normal text-foam">
              <span className="block overflow-hidden">
                <span data-line className="block">
                  {lead}
                </span>
              </span>
              <span className="block overflow-hidden">
                <span data-line className="block">
                  <em>{emphasis}</em> {rest}
                </span>
              </span>
            </h1>
          </div>
          <div data-meta className="lg:col-span-4 lg:pb-2">
            <p className="max-w-measure text-lead text-mist">{copy}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button href="/shop/men" variant="primary">
                Shop men
              </Button>
              <Button href="/shop/women" variant="outline">
                Shop women
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-6 border-t border-hairline pt-5 sm:flex-row sm:items-end sm:justify-between">
          <Link href={productHref} data-meta className="group">
            <p className="font-mono text-eyebrow uppercase text-aqua">Tide Slide</p>
            <p className="mt-1 font-body text-h3 tabular text-foam transition-colors duration-quick ease-tide group-hover:text-sand">
              {price}
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
          <div data-meta className="hidden items-center gap-3 font-mono text-eyebrow uppercase text-mist sm:flex">
            <span>Scroll</span>
            <span className="relative h-12 w-px overflow-hidden bg-hairline">
              <span data-scroll-line className="absolute inset-x-0 top-0 h-1/2 bg-aqua" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

void ScrollTrigger;
