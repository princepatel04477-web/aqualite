"use client";

import { RollingDigits } from "@/components/motion/RollingDigits";
import { cn } from "@/lib/cn";

/**
 * Bottom-right scene counter + autoplay pause control (H05). The active
 * number rolls via the RollingDigits primitive; the SCROLL cue stays beneath.
 */
export function HeroCounter({
  activeIndex,
  count,
  playPaused,
  onTogglePlay,
}: {
  activeIndex: number;
  count: number;
  playPaused: boolean;
  onTogglePlay: () => void;
}) {
  return (
    <div data-meta className="flex items-start gap-4 font-mono text-eyebrow uppercase text-mist">
      <p className="tabular pt-3">
        <span className="sr-only">Scene {activeIndex + 1} of {count}</span>
        <span aria-hidden="true" className="inline-flex items-center">
          0<RollingDigits value={activeIndex + 1} />
          <span className="mx-1">—</span>0{count}
        </span>
      </p>
      <div className="flex flex-col items-center gap-2">
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
        <span className="flex items-center gap-2">
          <span>Scroll</span>
          <span className="relative h-12 w-px overflow-hidden bg-hairline">
            <span data-scroll-line className="absolute inset-x-0 top-0 h-1/2 bg-aqua" />
          </span>
        </span>
      </div>
    </div>
  );
}
