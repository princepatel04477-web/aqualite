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
  const { reduced, allowCursorFX } = useMotionPolicy();

  useGSAP(
    () => {
      const node = root.current;
      if (!node || reduced) return;
      const lines = node.querySelectorAll("[data-line]");
      const shoe = node.querySelector("[data-shoe]");
      const meta = node.querySelectorAll("[data-meta]");
      const float = node.querySelector("[data-float]");
      const parallax = node.querySelector("[data-parallax]");
      const meter = node.querySelector("[data-scroll-line]");

      const tl = gsap.timeline({ paused: true });
      tl.from(shoe, { y: 18, scale: 1.03, opacity: 0, duration: duration.cinematic, ease: gsapEase.tide }, 0);
      tl.from(lines, { yPercent: 110, duration: duration.slow, stagger: stagger.loose, ease: gsapEase.tide }, 0.15);
      tl.from(meta, { y: 14, opacity: 0, duration: duration.base, stagger: stagger.base, ease: gsapEase.tide }, 0.35);

      const stopWait = whenIntroDone(() => tl.play());
      const fallback = window.setTimeout(() => tl.play(), 2800);

      const floatTween = float
        ? gsap.to(float, {
            y: 6,
            rotate: 1.0,
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
          xTo(px * 16);
          yTo(py * 8);
        };
        node.addEventListener("pointermove", onMove);
      }

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
        meterTween?.kill();
        if (onMove) node.removeEventListener("pointermove", onMove);
      };
    },
    { scope: root, revertOnUpdate: true, dependencies: [allowCursorFX, reduced] },
  );

  return (
    <section
      ref={root}
      data-header="transparent"
      className="relative -mt-[calc(var(--header-h)+2rem)] flex h-[100svh] min-h-[720px] flex-col justify-between overflow-hidden bg-ivory pt-[calc(var(--header-h)+2.25rem)]"
    >
      <TideField className="pointer-events-none absolute inset-0 h-full w-full" />

      <div className="relative z-[2] page-wrap flex flex-1 flex-col justify-between pb-6">
        <div className="relative grid flex-1 items-end gap-x-8 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div data-meta>
              <Eyebrow className="text-ink-2">{eyebrow}</Eyebrow>
            </div>
            <h1 className="heading-display mt-3 max-w-[11ch] font-display text-[clamp(2.75rem,4.5vw,5.15rem)] font-normal leading-[0.94] text-ink">
              <span className="block overflow-hidden pb-1">
                <span data-line className="block">
                  {lead}
                </span>
              </span>
              <span className="block overflow-hidden pb-1">
                <span data-line className="block">
                  <em>{emphasis}</em> {rest}
                </span>
              </span>
            </h1>
          </div>
          <div data-meta className="lg:col-span-6 flex flex-col justify-end">
            <div className="relative h-[clamp(180px,28vh,265px)] w-full">
              <div className="hero-glow pointer-events-none absolute -inset-6 z-0" />
              <div className="hero-contact-shadow pointer-events-none absolute inset-x-[10%] bottom-0 z-0 h-12" />
              <div data-parallax className="relative z-[1] flex h-full w-full items-center justify-center">
                <div data-float className="flex h-full w-full items-center justify-center">
                  <div data-shoe className="flex h-full w-full items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/catalog/hero/tide-slide/hero-desktop-1920.jpg"
                      alt="Aqualite Tide Slide in midnight with an aqua strap"
                      width={1400}
                      height={1000}
                      fetchPriority="high"
                      className="hero-shoe max-h-full max-w-[90%] object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 max-w-[38ch] text-lead text-ink-2">{copy}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button href="/shop/men" variant="primary">
                Shop men
              </Button>
              <Button href="/shop/women" variant="outline">
                Shop women
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-6 border-t border-hairline pt-4 sm:flex-row sm:items-end sm:justify-between">
          <Link href={productHref} data-meta className="group">
            <p className="font-mono text-eyebrow uppercase text-red-ink">Tide Slide</p>
            <p className="mt-0.5 font-body text-h3 tabular text-ink transition-colors duration-quick ease-tide group-hover:text-red-ink">
              {price}
            </p>
          </Link>
          <ul data-meta className="flex gap-3">
            {edit.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="group block w-24">
                  <span className="stage block aspect-[16/10] overflow-hidden border border-hairline">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-slow ease-tide group-hover:scale-105"
                    />
                  </span>
                  <span className="mt-1.5 block whitespace-nowrap font-mono text-[10px] uppercase text-ink-2 group-hover:text-ink">
                    {item.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div data-meta className="hidden items-center gap-3 font-mono text-eyebrow uppercase text-ink-2 sm:flex">
            <span>Scroll</span>
            <span className="relative h-5 w-px overflow-hidden bg-rule">
              <span data-scroll-line className="absolute inset-x-0 top-0 h-1/2 bg-red" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

void ScrollTrigger;
