"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import { matchesDesktopMotion } from "@/lib/mobile/useIsMobile";
import { cn } from "@/lib/cn";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { duration, gsapEase, stagger } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

/**
 * Listing grid rise. Desktop keeps the approved GSAP rise; on touch the
 * GSAP path never runs (no ScrollTriggers on phones — M06/M07) and the
 * CSS `.rise-grid > *` fade in globals.css handles the fade-only reflow.
 */
export function RiseGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { reduced } = useMotionPolicy();

  useGSAP(
    () => {
      const node = ref.current;
      if (!node || reduced || !matchesDesktopMotion()) return;
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
    <div ref={ref} className={cn("rise-grid", className)}>
      {children}
    </div>
  );
}

void ScrollTrigger;
