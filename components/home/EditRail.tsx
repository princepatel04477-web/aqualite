"use client";

import { useEffect, useRef } from "react";

/**
 * Horizontal snap rail (M06): native scroll-snap with scroll-padding
 * matching the page gutter, a thin progress line driven by a passive
 * scroll listener (transform only — no layout), and contained
 * overscroll so a swipe at the rail's edge never chains into history
 * navigation.
 */
export function EditRail({ children }: { children: React.ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = scroller.current;
    const mark = bar.current;
    if (!el || !mark) return;
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth;
      const progress = max <= 0 ? 1 : el.scrollLeft / max;
      mark.style.transform = `scaleX(${Math.max(0.08, progress)})`;
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div>
      <div
        ref={scroller}
        className="rail flex snap-x scroll-p-page gap-gutter overflow-x-auto overscroll-x-contain px-page pb-2"
      >
        {children}
      </div>
      <div className="page-wrap mt-6 h-px bg-hairline">
        <span
          ref={bar}
          data-rail-progress
          className="block h-full origin-left bg-aqua"
          style={{ transform: "scaleX(0.08)" }}
        />
      </div>
    </div>
  );
}
