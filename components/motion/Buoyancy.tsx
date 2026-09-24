"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import { matchesMobile } from "@/lib/mobile/useIsMobile";
import { gsap } from "@/lib/motion/gsap";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

/**
 * Idle float. Defaults to the approved desktop drift (down, tier-scaled).
 * M06 options: `amplitude` overrides the tier amplitude (hero floats at
 * half amplitude on phones), `lift` floats upward from rest so the shoe
 * never sinks below its resting line, and `mobileOnly` restricts the
 * tween to mobile/touch viewports so approved desktop pixels don't move.
 */
export function Buoyancy({
  children,
  className,
  amplitude,
  lift = false,
  mobileOnly = false,
}: {
  children: React.ReactNode;
  className?: string;
  amplitude?: number;
  lift?: boolean;
  mobileOnly?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { reduced, tier } = useMotionPolicy();

  useGSAP(
    () => {
      if (!ref.current || reduced) return;
      if (mobileOnly && !matchesMobile()) return;
      const amp = amplitude ?? (tier === "medium" ? 5 : 10);
      gsap.to(ref.current, {
        y: lift ? -amp : amp,
        rotate: tier === "medium" ? 0.8 : 1.6,
        duration: 2.1,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
    },
    { scope: ref, dependencies: [amplitude, lift, mobileOnly, reduced, tier] },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
