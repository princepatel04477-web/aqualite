"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";

import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Heading } from "@/components/ui/Heading";
import { matchesDesktopMotion } from "@/lib/mobile/useIsMobile";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { duration, gsapEase } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

type Layer = { index: string; name: string; claim: string; spec: string };

export function Anatomy({ layers }: { layers: Layer[] }) {
  const root = useRef<HTMLElement>(null);
  const deck = useRef<HTMLDivElement>(null);
  const { reduced, allowPinning } = useMotionPolicy();
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const node = root.current;
      // Desktop-only scrub/opacity rows; mobile gets the swipeable deck,
      // so no ScrollTrigger may be created on touch (M06).
      if (!node || reduced || !matchesDesktopMotion()) return;
      const bar = node.querySelector("[data-progress]");
      const rows = node.querySelectorAll("[data-layer]");
      const triggers: ScrollTrigger[] = [];
      if (bar && allowPinning) {
        const tween = gsap.fromTo(
          bar,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: gsapEase.linear,
            scrollTrigger: {
              trigger: node,
              start: "top 70%",
              end: "bottom 60%",
              scrub: true,
            },
          },
        );
        if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
      }
      gsap.set(rows, { opacity: 0.38 });
      rows.forEach((row) => {
        const trigger = ScrollTrigger.create({
          trigger: row,
          start: "top 62%",
          end: "bottom 38%",
          onToggle: (self) => {
            gsap.to(row, {
              opacity: self.isActive ? 1 : 0.38,
              duration: duration.base,
              ease: gsapEase.tide,
            });
          },
        });
        triggers.push(trigger);
      });
      return () => {
        triggers.forEach((trigger) => trigger.kill());
      };
    },
    { scope: root, dependencies: [allowPinning, reduced] },
  );

  useEffect(() => {
    const el = deck.current;
    if (!el) return;
    const onScroll = () => {
      const first = el.firstElementChild as HTMLElement | null;
      if (!first || layers.length < 2) return;
      const second = el.children[1] as HTMLElement | undefined;
      const step = second
        ? second.offsetLeft - first.offsetLeft
        : first.offsetWidth;
      if (step <= 0) return;
      setActive(
        Math.min(
          layers.length - 1,
          Math.max(0, Math.round(el.scrollLeft / step)),
        ),
      );
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [layers.length]);

  return (
    <section ref={root} className="py-section">
      {/* ── Mobile: swipeable card deck (M06) — replaces the desktop
          scroll-highlight rows with one layer per snap card. ── */}
      <div className="page-wrap lg:hidden">
        <Eyebrow index="04" total="06">
          Construction
        </Eyebrow>
        <Heading level={2} className="mt-3">
          What&apos;s <em>underfoot</em>.
        </Heading>
      </div>
      <Reveal className="mt-8 lg:hidden">
        <div
          ref={deck}
          className="rail flex snap-x scroll-p-page gap-gutter overflow-x-auto overscroll-x-contain px-page pb-2"
        >
          {layers.map((layer) => (
            <article
              key={layer.index}
              className="w-[78vw] max-w-[20rem] shrink-0 snap-start rounded-panel border border-hairline p-4"
            >
              <div className="stage flex aspect-[16/10] items-center justify-center">
                <span
                  aria-hidden="true"
                  className="font-display text-display text-ink-on-porcelain/25"
                >
                  {layer.index}
                </span>
              </div>
              <p className="mt-4 font-mono text-eyebrow text-aqua">
                {layer.index}
              </p>
              <h3 className="mt-2 font-display text-h3">{layer.name}</h3>
              <p className="mt-2 text-body text-mist">{layer.claim}</p>
              <p className="mt-3 font-mono text-size uppercase text-foam">
                {layer.spec}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-4 flex justify-center gap-2" aria-hidden="true">
          {layers.map((layer, index) => (
            <span
              key={layer.index}
              className={
                index === active
                  ? "h-1.5 w-6 rounded-pill bg-aqua transition-all duration-quick ease-tide"
                  : "h-1.5 w-1.5 rounded-pill bg-hairline transition-all duration-quick ease-tide"
              }
            />
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          Layer {active + 1} of {layers.length}
        </p>
      </Reveal>

      {/* ── Desktop: approved scroll-highlight rows, untouched above 1024px ── */}
      <div className="page-wrap hidden gap-12 lg:grid lg:grid-cols-12">
        <div className="lg:sticky lg:top-32 lg:col-span-4 lg:self-start">
          <Eyebrow index="04" total="06">
            Construction
          </Eyebrow>
          <Heading level={2} className="mt-3">
            What&apos;s <em>underfoot</em>.
          </Heading>
          <div className="relative mt-10 hidden h-40 w-px bg-hairline lg:block">
            <div
              data-progress
              className="absolute inset-x-0 top-0 h-full origin-top bg-aqua"
            />
          </div>
        </div>
        <div className="lg:col-span-8">
          {layers.map((layer) => (
            <article
              key={layer.index}
              data-layer
              className="layer-row border-t border-hairline py-8 last:border-b"
            >
              <p className="font-mono text-eyebrow text-aqua">{layer.index}</p>
              <h3 className="mt-2 font-display text-h2">{layer.name}</h3>
              <p className="mt-3 max-w-measure text-lead text-mist">
                {layer.claim}
              </p>
              <p className="mt-4 font-mono text-size text-foam">{layer.spec}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
