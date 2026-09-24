"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { motion } from "motion/react";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { duration, ease, gsapEase, stagger } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

export type IndexRow = {
  href: string;
  label: string;
  count: number;
  note: string;
  image: string | null;
};

export function ShopIndex({ rows }: { rows: IndexRow[] }) {
  const root = useRef<HTMLElement>(null);
  const { reduced } = useMotionPolicy();
  const [active, setActive] = useState<number | null>(null);

  useGSAP(
    () => {
      const node = root.current;
      if (!node || reduced) return;
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
      {rows.map((row, index) => (
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
                animate={{ opacity: active === index ? 1 : 0, y: active === index ? 0 : 18 }}
                transition={{ duration: duration.base, ease: ease.tide }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={row.image} alt="" className="h-full w-full object-cover" />
              </motion.span>
            ) : (
              <span className="font-mono text-eyebrow uppercase text-mist group-hover:text-ink-on-porcelain/60">{row.note}</span>
            )}
          </span>
          <span className="col-span-3 text-right font-mono text-size text-mist group-hover:text-ink-on-porcelain/70 sm:col-span-2">
            {row.count} {row.count === 1 ? "pair" : "pairs"}
          </span>
        </Link>
      ))}
    </section>
  );
}

void ScrollTrigger;
