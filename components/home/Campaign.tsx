"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Heading } from "@/components/ui/Heading";
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
      if (!node || reduced) return;
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={name} className="w-full" />
          </div>
        </div>
        <div className="px-page py-section lg:col-span-5 lg:py-20">
          <Eyebrow index="05" total="06" className="text-ink-on-porcelain/60">
            Featured drop
          </Eyebrow>
          <Heading level={2} className="mt-3 text-ink-on-porcelain">
            The <em>Tide</em> slide.
          </Heading>
          <ul className="mt-6 space-y-2 font-mono text-size uppercase text-ink-on-porcelain/80">
            {features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <p className="mt-8 font-body text-h3 tabular">{price}</p>
          <Button href={href} variant="primary" className="mt-8 bg-abyss text-foam hover:bg-trench">
            Shop the drop
          </Button>
        </div>
      </div>
    </section>
  );
}

void ScrollTrigger;
