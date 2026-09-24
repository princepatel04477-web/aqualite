"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { duration, gsapEase, stagger } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

export function RiseGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { reduced } = useMotionPolicy();

  useGSAP(
    () => {
      const node = ref.current;
      if (!node || reduced) return;
      const tween = gsap.from(node.children, {
        y: 24,
        opacity: 0,
        duration: duration.base,
        stagger: stagger.base,
        ease: gsapEase.tide,
        immediateRender: false,
        scrollTrigger: { trigger: node, start: "top 86%", once: true },
      });
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

void ScrollTrigger;
