"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import { cn } from "@/lib/cn";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { duration, gsapEase } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

export function WetInk({
  children,
  className,
  trigger = "scroll",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  trigger?: "scroll" | "load";
  as?: "div" | "h1" | "h2" | "h3";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { reduced } = useMotionPolicy();

  useGSAP(
    () => {
      const node = ref.current;
      if (!node) return;
      const inner = node.querySelector("[data-wet]") ;
      if (!(inner instanceof HTMLElement)) return;
      if (reduced) {
        gsap.fromTo(inner, { opacity: 0 }, { opacity: 1, duration: duration.quick });
        return;
      }
      const tween = gsap.fromTo(
        inner,
        { yPercent: 105 },
        {
          yPercent: 0,
          duration: duration.slow,
          ease: gsapEase.tide,
          scrollTrigger:
            trigger === "scroll"
              ? { trigger: node, start: "top 88%", once: true }
              : undefined,
        },
      );
      if (trigger === "load") tween.play();
      return () => {
        tween.scrollTrigger?.kill();
      };
    },
    { scope: ref, dependencies: [reduced, trigger] },
  );

  return (
    <Tag ref={ref as never} className={cn("overflow-hidden", className)}>
      <span data-wet className="block will-change-transform">
        {children}
      </span>
    </Tag>
  );
}

void ScrollTrigger;
