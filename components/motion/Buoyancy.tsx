"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import { gsap } from "@/lib/motion/gsap";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

export function Buoyancy({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { reduced, tier } = useMotionPolicy();

  useGSAP(
    () => {
      if (!ref.current || reduced) return;
      const amp = tier === "medium" ? 5 : 10;
      gsap.to(ref.current, {
        y: amp,
        rotate: tier === "medium" ? 0.8 : 1.6,
        duration: 2.1,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
    },
    { scope: ref, dependencies: [reduced, tier] },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
