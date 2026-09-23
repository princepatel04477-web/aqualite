"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { Heading } from "@/components/ui/Heading";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { duration, gsapEase } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

type Layer = { index: string; name: string; claim: string; spec: string };

export function Anatomy({ layers }: { layers: Layer[] }) {
  const root = useRef<HTMLElement>(null);
  const { reduced, allowPinning } = useMotionPolicy();

  useGSAP(
    () => {
      const node = root.current;
      if (!node || reduced) return;
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
            scrollTrigger: { trigger: node, start: "top 70%", end: "bottom 60%", scrub: true },
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
            gsap.to(row, { opacity: self.isActive ? 1 : 0.38, duration: duration.base, ease: gsapEase.tide });
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

  return (
    <section ref={root} className="py-section">
      <div className="page-wrap grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4 lg:sticky lg:top-32 lg:self-start">
          <Eyebrow index="04" total="06">
            Construction
          </Eyebrow>
          <Heading level={2} className="mt-3">
            What&apos;s <em>underfoot</em>.
          </Heading>
          <div className="relative mt-10 hidden h-40 w-px bg-hairline lg:block">
            <div data-progress className="absolute inset-x-0 top-0 h-full origin-top bg-aqua" />
          </div>
        </div>
        <div className="lg:col-span-8">
          {layers.map((layer) => (
            <article key={layer.index} data-layer className="layer-row border-t border-hairline py-8 last:border-b">
              <p className="font-mono text-eyebrow text-aqua">{layer.index}</p>
              <h3 className="mt-2 font-display text-h2">{layer.name}</h3>
              <p className="mt-3 max-w-measure text-lead text-mist">{layer.claim}</p>
              <p className="mt-4 font-mono text-size text-foam">{layer.spec}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
