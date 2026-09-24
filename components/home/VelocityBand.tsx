"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

/**
 * Velocity band (M06). Mobile shows one row at velocity 20; the second
 * mono row is desktop-only. The marquee pauses when offscreen (saved
 * main-thread time on phones) and is rendered as a single static line
 * on low tier / reduced motion. Decorative — hidden from AT.
 */
export function VelocityBand() {
  const ref = useRef<HTMLDivElement>(null);
  const { reduced, tier } = useMotionPolicy();
  const [paused, setPaused] = useState(false);
  const animate = !reduced && tier !== "low";

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      setPaused(!(entry?.isIntersecting ?? true));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      data-paused={paused && animate ? "true" : undefined}
      className="cv-auto overflow-hidden border-y border-hairline py-8"
      aria-hidden="true"
    >
      <div
        className={cn(
          "marquee-track flex w-max gap-12 whitespace-nowrap font-display text-h1 italic text-foam/90",
          !animate && "marquee-static",
        )}
      >
        {Array.from({ length: 2 }, (_, copy) => (
          <span key={copy}>
            Walk on water — Aqualite — Walk on water — Aqualite —{" "}
          </span>
        ))}
      </div>
      <div className="marquee-track reverse mt-3 hidden w-max gap-8 whitespace-nowrap font-mono text-eyebrow uppercase text-mist lg:flex">
        {Array.from({ length: 2 }, (_, copy) => (
          <span key={copy}>
            Waterproof · Featherlight · Grip that holds · Made for the monsoon
            ·{" "}
          </span>
        ))}
      </div>
    </section>
  );
}
