"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export type HeroCtaPair = { primary: string; secondary: string };

/**
 * Per-slide CTAs (H05). Labels swap during the H04 transition, but button
 * widths never change: the widest label across all slides is measured off-screen
 * (fonts included) and applied as min-width, so nothing jumps mid-morph.
 */
export function HeroCtas({
  pairs,
  primary,
  secondary,
  primaryHref,
  secondaryHref,
  active,
}: {
  pairs: HeroCtaPair[];
  primary: string;
  secondary: string;
  primaryHref: string;
  secondaryHref: string;
  active: boolean;
}) {
  const sizer = useRef<HTMLDivElement>(null);
  const [minWidths, setMinWidths] = useState<{ primary: number; secondary: number } | null>(null);

  const measure = useCallback(() => {
    const node = sizer.current;
    if (!node) return;
    const primaryWidth = Math.max(
      ...pairs.map((pair) => node.querySelector<HTMLElement>(`[data-sizer-primary="${pair.primary}"]`)?.offsetWidth ?? 0),
    );
    const secondaryWidth = Math.max(
      ...pairs.map((pair) => node.querySelector<HTMLElement>(`[data-sizer-secondary="${pair.secondary}"]`)?.offsetWidth ?? 0),
    );
    setMinWidths((current) => {
      const next = { primary: primaryWidth + 1, secondary: secondaryWidth + 1 };
      if (current && current.primary === next.primary && current.secondary === next.secondary) return current;
      return next;
    });
  }, [pairs]);

  useLayoutEffect(measure, [measure]);
  useEffect(() => {
    document.fonts?.ready.then(() => measure()).catch(() => undefined);
  }, [measure]);

  return (
    <div data-hero-ctas className="mt-6 flex flex-wrap items-center gap-3">
      <div ref={sizer} aria-hidden="true" className="pointer-events-none invisible absolute -top-[9999px] left-0">
        {pairs.map((pair, pairIndex) => (
          <div key={`${pair.primary}-${pairIndex}`}>
            <span
              data-sizer-primary={pair.primary}
              className="inline-flex items-center justify-center whitespace-nowrap px-5 font-body text-button font-medium uppercase tracking-normal"
            >
              {pair.primary}
            </span>
            <span
              data-sizer-secondary={pair.secondary}
              className="inline-flex items-center justify-center whitespace-nowrap px-5 font-body text-button font-medium uppercase"
            >
              {pair.secondary}
            </span>
          </div>
        ))}
      </div>
      <Button
        href={primaryHref}
        variant="primary"
        tabIndex={active ? undefined : -1}
        className={cn("justify-center whitespace-nowrap")}
        style={minWidths ? { minWidth: minWidths.primary } : undefined}
      >
        {primary}
      </Button>
      <Button
        href={secondaryHref}
        variant="outline"
        tabIndex={active ? undefined : -1}
        className="justify-center whitespace-nowrap"
        style={minWidths ? { minWidth: minWidths.secondary } : undefined}
      >
        {secondary}
      </Button>
    </div>
  );
}
