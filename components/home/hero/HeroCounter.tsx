"use client";

import { RollingDigits } from "@/components/motion/RollingDigits";
import { cn } from "@/lib/cn";

/**
 * Scene counter + autoplay pause control + scroll cue (R03 Defect 5, 6, 7).
 * One aligned group on a shared horizontal baseline:
 *   04 / 05 · Pause · Scroll
 * Right-aligned to the content edge.
 */
export function HeroCounter({
  activeIndex,
  count,
  playPaused,
  onTogglePlay,
  compact = false,
}: {
  activeIndex: number;
  count: number;
  playPaused: boolean;
  onTogglePlay: () => void;
  compact?: boolean;
}) {
  return (
    <div
      data-meta
      data-hero-counter-group
      className={cn(
        "flex items-center justify-end font-mono text-eyebrow uppercase text-ink-2",
        compact ? "gap-2.5" : "gap-3",
      )}
    >
      <p data-hero-counter className="inline-flex h-8 items-center tabular leading-none">
        <span className="sr-only">
          Scene {activeIndex + 1} of {count}
        </span>
        <span aria-hidden="true" className="inline-flex items-center">
          0<RollingDigits value={activeIndex + 1} />
          <span className="mx-1.5 text-muted">/</span>
          0{count}
        </span>
      </p>
      <span aria-hidden="true" className="inline-flex h-8 items-center text-rule">
        ·
      </span>
      <button
        type="button"
        data-hero-pause
        onClick={onTogglePlay}
        aria-pressed={playPaused}
        aria-label={playPaused ? "Play autoplay" : "Pause autoplay"}
        className={cn(
          "inline-flex h-8 items-center justify-center px-1.5 font-mono text-eyebrow uppercase leading-none transition-colors duration-quick ease-tide",
          playPaused ? "text-red-ink" : "text-ink-2 hover:text-ink",
        )}
      >
        {playPaused ? "Play" : "Pause"}
      </button>
      {compact ? null : (
        <>
          <span aria-hidden="true" className="inline-flex h-8 items-center text-rule">
            ·
          </span>
          <span data-hero-scroll-cue className="inline-flex h-8 items-center gap-2 leading-none">
            <span>Scroll</span>
            <span className="relative h-5 w-px overflow-hidden bg-rule">
              <span data-scroll-line className="absolute inset-x-0 top-0 h-1/2 bg-red" />
            </span>
          </span>
        </>
      )}
    </div>
  );
}
