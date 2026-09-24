import { useEffect, useState } from "react";

export interface VisualViewportState {
  height: number;
  width: number;
  offsetTop: number;
  /** Space the on-screen keyboard eats into the layout viewport. */
  keyboardInset: number;
  scale: number;
}

const INITIAL: VisualViewportState = {
  height: 0,
  width: 0,
  offsetTop: 0,
  keyboardInset: 0,
  scale: 1,
};

/**
 * Tracks the visual viewport so bottom-fixed bars can lift above the
 * keyboard and we can assert the page never zooms on input focus.
 * Behaviour only — do not use it to choose layout (use CSS).
 */
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(INITIAL);

  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const update = () => {
      const layoutHeight = window.innerHeight;
      setState({
        height: vv.height,
        width: vv.width,
        offsetTop: vv.offsetTop,
        keyboardInset: Math.max(0, layoutHeight - vv.height - vv.offsetTop),
        scale: vv.scale,
      });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return state;
}
