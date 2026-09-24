import { useEffect, useState } from "react";

/**
 * True when the primary pointer is coarse (touch). Use for *behaviour*
 * only (event handling, gesture setup) — never to switch layout, which
 * must be decided with CSS media queries to avoid hydration mismatch.
 */
export function useIsTouch(): boolean {
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setTouch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return touch;
}
