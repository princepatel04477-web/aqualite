"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import { Buoyancy } from "@/components/motion/Buoyancy";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Heading } from "@/components/ui/Heading";
import { matchesDesktopMotion } from "@/lib/mobile/useIsMobile";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { duration, gsapEase } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

export function Campaign({
  image,
  name,
  price,
  href,
  features,
}: {
  image: string;
  name: string;
  price: string;
  href: string;
  features: string[];
}) {
  const root = useRef<HTMLElement>(null);
  const { reduced } = useMotionPolicy();

  useGSAP(
    () => {
      const node = root.current;
      // Desktop-only clip reveal; mobile stacks calmly with a mobile-only
      // idle float and no ScrollTrigger (M06).
      if (!node || reduced || !matchesDesktopMotion()) return;
      const frame = node.querySelector("[data-frame]");
      if (!frame) return;
      const tween = gsap.from(frame, {
        clipPath: "inset(14% 10% 14% 10%)",
        duration: duration.cinematic,
        ease: gsapEase.tide,
        immediateRender: false,
        scrollTrigger: { trigger: node, start: "top 75%", once: true },
      });
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    },
    { scope: root, dependencies: [reduced] },
  );

  return (
    <section ref={root} className="bg-porcelain text-ink-on-porcelain">
      <div className="grid items-end lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div data-frame className="overflow-hidden bg-porcelain">
            {/* Mobile: idle float only — no hover sheen on touch (M06). */}
            <Buoyancy mobileOnly>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt={name} loading="lazy" className="w-full" />
            </Buoyancy>
          </div>
        </div>
        <div className="px-page py-section lg:col-span-5 lg:py-20">
          <Eyebrow index="05" total="06" className="text-ink-on-porcelain/60">
            Featured drop
          </Eyebrow>
          <Heading level={2} className="mt-3 text-ink-on-porcelain">
            The <em>Tide</em> slide.
          </Heading>
          {/* Mobile: feature chips in a wrapping row; desktop keeps the list. */}
          <ul className="mt-6 flex flex-wrap gap-2 font-mono text-size uppercase text-ink-on-porcelain/80 lg:block lg:space-y-2">
            {features.map((feature) => (
              <li
                key={feature}
                className="max-lg:rounded-pill max-lg:border max-lg:border-ink-on-porcelain/25 max-lg:px-3 max-lg:py-1.5"
              >
                {feature}
              </li>
            ))}
          </ul>
          <p className="tabular mt-8 font-body text-h3">{price}</p>
          <Button
            href={href}
            variant="primary"
            className="mt-8 w-full bg-abyss text-foam hover:bg-trench lg:w-auto"
          >
            Shop the drop
          </Button>
        </div>
      </div>
    </section>
  );
}

void ScrollTrigger;
