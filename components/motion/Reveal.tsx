"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { duration, gsapEase } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { reduced, revealDistance } = useMotionPolicy();

  useGSAP(
    () => {
      const node = ref.current;
      if (!node || reduced) return;
      const tween = gsap.from(node, {
        y: revealDistance,
        opacity: 0,
        duration: duration.base,
        delay,
        ease: gsapEase.tide,
        immediateRender: false,
        scrollTrigger: { trigger: node, start: "top 88%", once: true },
      });
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    },
    { scope: ref, dependencies: [delay, reduced, revealDistance] },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

void ScrollTrigger;
