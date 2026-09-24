/**
 * Mobile viewport behaviour hook (viewport < 1024px OR pointer: coarse).
 * Behaviour-only — layout decisions stay in CSS media queries (M06).
 */
import { useMediaQuery } from "@/lib/mobile/useMediaQuery";

const QUERY = "(max-width: 1023px), (pointer: coarse)";

export function useIsMobile(): boolean {
  return useMediaQuery(QUERY);
}

/** Non-reactive check for use inside effects / GSAP callbacks. */
export function matchesMobile(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/**
 * True only where the approved desktop choreography may run: wide
 * viewport with a fine, hover-capable pointer. Touch and narrow
 * viewports never create ScrollTriggers (M06).
 */
export function matchesDesktopMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(
    "(min-width: 1024px) and (hover: hover) and (pointer: fine)",
  ).matches;
}
