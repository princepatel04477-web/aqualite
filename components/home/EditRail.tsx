"use client";

import { useRef } from "react";

export function EditRail({ children }: { children: React.ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  const onScroll = () => {
    const el = scroller.current;
    const mark = bar.current;
    if (!el || !mark) return;
    const max = el.scrollWidth - el.clientWidth;
    const progress = max <= 0 ? 1 : el.scrollLeft / max;
    mark.style.transform = `scaleX(${Math.max(0.08, progress)})`;
  };

  return (
    <div>
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex snap-x gap-gutter overflow-x-auto px-page pb-2"
      >
        {children}
      </div>
      <div className="page-wrap mt-6 h-px bg-hairline">
        <span ref={bar} className="block h-full origin-left bg-aqua" style={{ transform: "scaleX(0.08)" }} />
      </div>
    </div>
  );
}
