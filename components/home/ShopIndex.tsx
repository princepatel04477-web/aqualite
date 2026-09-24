"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { motion } from "motion/react";

import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { matchesDesktopMotion } from "@/lib/mobile/useIsMobile";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { duration, ease, gsapEase, stagger } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";
import { visibleIndexRows } from "@/lib/content/visibility";

export type IndexRow = {
  href: string;
  label: string;
  count: number;
  note: string;
  image: string | null;
  keepWhenEmpty?: boolean;
};

export function ShopIndex({ rows }: { rows: IndexRow[] }) {
  const root = useRef<HTMLElement>(null);
  const { reduced } = useMotionPolicy();
  const [active, setActive] = useState<number | null>(null);
  const visibleRows = visibleIndexRows(rows);

  useGSAP(
    () => {
      const node = root.current;
      // Desktop-only reveal: the hover index rows don't render on
      // mobile/touch, so no ScrollTrigger may be created there (M06).
      if (!node || reduced || !matchesDesktopMotion()) return;
      const items = node.querySelectorAll("[data-row]");
      const tween = gsap.from(items, {
        y: 28,
        opacity: 0,
        duration: duration.base,
        stagger: stagger.base,
        ease: gsapEase.tide,
        immediateRender: false,
        scrollTrigger: { trigger: node, start: "top 80%", once: true },
      });
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    },
    { scope: root, dependencies: [reduced] },
  );

  return (
    <section ref={root} className="border-t border-hairline">
      <div className="page-wrap py-10">
        <Eyebrow index="02" total="06">
          Shop by
        </Eyebrow>
      </div>

      {/* ── Mobile: 2×2 porcelain tile grid (M06) — replaces the hover index
          with tappable tiles; empty categories stay hidden (M02), a
          keepWhenEmpty row shows its Coming soon tile. ── */}
      <Reveal className="page-wrap grid grid-cols-2 gap-gutter pb-10 lg:hidden">
        {visibleRows.map((row) =>
          row.count > 0 ? (
            <Link
              key={row.href}
              href={row.href}
              className="group relative flex aspect-[10/11] flex-col overflow-hidden rounded-panel bg-porcelain text-ink-on-porcelain after:absolute after:inset-0 after:bg-abyss/0 after:transition-colors after:duration-quick after:ease-tide after:content-[''] group-active:after:bg-abyss/10"
            >
              <span className="relative flex-1 overflow-hidden">
                {row.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={row.image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-base ease-tide group-active:scale-[0.98]"
                  />
                ) : null}
              </span>
              <span className="flex items-baseline justify-between gap-2 px-3.5 pb-3 pt-2.5">
                <span className="font-display text-h3 leading-none">
                  {row.label}
                </span>
                <span className="font-mono text-eyebrow uppercase text-ink-on-porcelain/60">
                  {row.count} {row.count === 1 ? "pair" : "pairs"}
                </span>
              </span>
            </Link>
          ) : (
            <div
              key={row.href}
              aria-disabled="true"
              className="flex aspect-[10/11] flex-col items-center justify-center gap-2 rounded-panel border border-dashed border-hairline px-3 text-center"
            >
              <span className="font-display text-h3 text-mist">
                {row.label}
              </span>
              <span className="font-mono text-eyebrow uppercase text-mist">
                Coming soon
              </span>
            </div>
          ),
        )}
      </Reveal>

      {/* ── Desktop: approved hover index, untouched above 1024px ── */}
      <div className="hidden lg:block">
        {visibleRows.map((row, index) =>
          row.count > 0 ? (
            <Link
              key={row.href}
              href={row.href}
              data-row
              className="group relative grid grid-cols-12 items-end border-t border-hairline px-page py-7 text-foam transition-colors duration-base ease-tide last:border-b hover:z-10 hover:bg-porcelain hover:text-ink-on-porcelain lg:py-9"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
            >
              <span className="col-span-2 font-mono text-eyebrow text-aqua group-hover:text-aqua-deep sm:col-span-1">
                0{index + 1}
              </span>
              <span className="col-span-7 font-display text-h2 transition-transform duration-base ease-tide group-hover:-translate-y-1 sm:col-span-6 lg:text-h1">
                {row.label}
              </span>
              <span className="relative col-span-3 hidden sm:block">
                {row.image ? (
                  <motion.span
                    className="pointer-events-none absolute bottom-0 right-4 block h-28 w-24 overflow-hidden bg-porcelain"
                    initial={false}
                    animate={{
                      opacity: active === index ? 1 : 0,
                      y: active === index ? 0 : 18,
                    }}
                    transition={{ duration: duration.base, ease: ease.tide }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={row.image}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </motion.span>
                ) : (
                  <span className="font-mono text-eyebrow uppercase text-mist group-hover:text-ink-on-porcelain/60">
                    {row.note}
                  </span>
                )}
              </span>
              <span className="col-span-3 text-right font-mono text-size text-mist group-hover:text-ink-on-porcelain/70 sm:col-span-2">
                {row.count} {row.count === 1 ? "pair" : "pairs"}
              </span>
            </Link>
          ) : (
            <div
              key={row.href}
              data-row
              aria-disabled="true"
              className="group relative grid grid-cols-12 items-end border-t border-hairline px-page py-7 text-foam last:border-b lg:py-9"
            >
              <span className="col-span-2 font-mono text-eyebrow text-aqua sm:col-span-1">
                0{index + 1}
              </span>
              <span className="col-span-7 font-display text-h2 sm:col-span-6 lg:text-h1">
                {row.label}
              </span>
              <span className="col-span-3 text-right font-mono text-size text-mist sm:col-span-2">
                Coming soon
              </span>
            </div>
          ),
        )}
      </div>
    </section>
  );
}

void ScrollTrigger;
