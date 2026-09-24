"use client";

import { useRef } from "react";
import { useInView, motion } from "motion/react";
import { useGSAP } from "@gsap/react";

import { useIsMobile } from "@/lib/mobile/useIsMobile";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { distance, duration, ease, gsapEase } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

/**
 * Scroll reveal with split ownership (M06): desktop keeps the approved
 * GSAP ScrollTrigger reveal; mobile/touch reveals with Motion whileInView
 * (once, amount 0.2, y 12 → 0) so no ScrollTrigger instance exists on a
 * phone. SSR renders children visible and the Motion path arms after
 * hydration, so no-JS crawlers and reduced-motion users see content.
 */
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
  const isMobile = useIsMobile();
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const motionOwns = isMobile && !reduced;

  useGSAP(
    () => {
      if (motionOwns) return; // Motion owns the reveal on mobile.
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
    { scope: ref, dependencies: [delay, reduced, revealDistance, motionOwns] },
  );

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={
        motionOwns && !inView
          ? { y: distance.revealMobile, opacity: 0 }
          : { y: 0, opacity: 1 }
      }
      transition={{ duration: duration.base, ease: ease.tide, delay }}
    >
      {children}
    </motion.div>
  );
}

void ScrollTrigger;
