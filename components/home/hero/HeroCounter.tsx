"use client";

import { RollingDigits } from "@/components/motion/RollingDigits";
import { cn } from "@/lib/cn";

/**
 * Scene counter + autoplay pause control (H05 desktop, H06 compact mobile).
 * The active number rolls via the RollingDigits primitive; the SCROLL cue is
 * desktop-only (mobile reads bottom-up through the thumb row instead).
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
      className={cn(
        "flex font-mono text-eyebrow uppercase text-mist",
        compact ? "items-center gap-3" : "items-start gap-4",
      )}
    >
      <p className="tabular">
        <span className="sr-only">
          Scene {activeIndex + 1} of {count}
        </span>
        <span aria-hidden="true" className="inline-flex items-center">
          0<RollingDigits value={activeIndex + 1} />
          <span className="mx-1">—</span>
          0{count}
        </span>
      </p>
      <button
        type="button"
        onClick={onTogglePlay}
        aria-pressed={playPaused}
        aria-label={playPaused ? "Play autoplay" : "Pause autoplay"}
        className={cn(
          "flex h-11 min-w-11 items-center justify-center px-2 font-mono text-eyebrow uppercase transition-colors duration-quick ease-tide",
          playPaused ? "text-aqua" : "text-mist hover:text-foam",
        )}
      >
        {playPaused ? "Play" : "Pause"}
      </button>
      {compact ? null : (
        <span className="flex items-center gap-2 pt-3">
          <span>Scroll</span>
          <span className="relative h-12 w-px overflow-hidden bg-hairline">
            <span data-scroll-line className="absolute inset-x-0 top-0 h-1/2 bg-aqua" />
          </span>
        </span>
      )}
    </div>
  );
}
