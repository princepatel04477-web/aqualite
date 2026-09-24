"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";
import { useGSAP } from "@gsap/react";

import { useIsMobile } from "@/lib/mobile/useIsMobile";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { duration, ease, gsapEase } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

/**
 * Counts from 0 to `value` once, when the number scrolls into view.
 * Desktop keeps the approved GSAP ScrollTrigger; mobile/touch counts
 * with a Motion lifecycle animation (M06) so phones create zero
 * ScrollTrigger instances. SSR always shows the final number so no-JS
 * visitors and crawlers never see "0".
 */
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { reduced } = useMotionPolicy();
  const isMobile = useIsMobile();
  // ≈ GSAP's "top 85%" start line on mobile.
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  // SSR the final number so no-JS and crawlers never see "0".
  const [shown, setShown] = useState(value);

  useGSAP(
    () => {
      if (isMobile) return; // Motion owns the count on mobile.
      const node = ref.current;
      if (!node || reduced) return;
      const proxy = { n: 0 };
      const tween = gsap.to(proxy, {
        n: value,
        duration: duration.cinematic,
        ease: gsapEase.tide,
        scrollTrigger: {
          trigger: node,
          start: "top 85%",
          once: true,
          onEnter: () => setShown(0),
        },
        onUpdate: () => setShown(Math.round(proxy.n)),
      });
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    },
    { scope: ref, dependencies: [isMobile, reduced, value] },
  );

  useEffect(() => {
    if (!isMobile || reduced || !inView) return;
    setShown(0);
    const controls = animate(0, value, {
      duration: duration.cinematic,
      ease: ease.tide,
      onUpdate: (latest) => setShown(Math.round(latest)),
    });
    return () => controls.stop();
  }, [isMobile, inView, reduced, value]);

  return <span ref={ref}>{shown.toLocaleString("en-IN")}</span>;
}

void ScrollTrigger;
