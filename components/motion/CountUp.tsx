"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";

import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { duration, gsapEase } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { reduced } = useMotionPolicy();
  const [shown, setShown] = useState(reduced ? value : 0);

  useGSAP(
    () => {
      const node = ref.current;
      if (!node || reduced) return;
      const proxy = { n: 0 };
      const tween = gsap.to(proxy, {
        n: value,
        duration: duration.cinematic,
        ease: gsapEase.tide,
        scrollTrigger: { trigger: node, start: "top 85%", once: true },
        onUpdate: () => setShown(Math.round(proxy.n)),
      });
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    },
    { scope: ref, dependencies: [reduced, value] },
  );

  return <span ref={ref}>{shown.toLocaleString("en-IN")}</span>;
}

void ScrollTrigger;
