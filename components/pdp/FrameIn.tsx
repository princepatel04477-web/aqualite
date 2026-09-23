"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import { gsap } from "@/lib/motion/gsap";
import { duration, gsapEase } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

export function FrameIn({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { reduced } = useMotionPolicy();

  useGSAP(
    () => {
      const node = ref.current;
      if (!node || reduced) return;
      gsap.from(node, { scale: 1.06, duration: duration.cinematic, ease: gsapEase.tide });
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <div ref={ref} data-pdp-image className={className}>
      {children}
    </div>
  );
}
