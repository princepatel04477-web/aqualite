import { gsap } from "@/lib/motion/gsap";

/** #RRGGBB → [r, g, b]; invalid input falls back to the Tide teal. */
export function hexToRgb(hex: string): [number, number, number] {
  const match = /^#?([0-9A-Fa-f]{6})$/.exec(hex);
  if (!match) return [30, 127, 120];
  const value = Number.parseInt(match[1] ?? "", 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function cssRgb([r, g, b]: [number, number, number]): string {
  return `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`;
}

/** Reads the current value of the hero glow variable on (or above) an element. */
export function readGlow(element: HTMLElement): string {
  return element.style.getPropertyValue("--hero-glow");
}

/**
 * Writes the glow variable instantly (reduced motion, first paint).
 * The variable is a plain srgb colour, so color-mix() layers can alpha it.
 */
export function setGlow(element: HTMLElement, hex: string): void {
  element.style.setProperty("--hero-glow", cssRgb(hexToRgb(hex)));
}

/**
 * Tweens the --hero-glow custom property from one hex to another through an
 * object proxy in RGB space (H04 t=0.20). Only the variable changes; every
 * layer that reads it (scene glow, ripple accents) follows in one paint.
 */
export function tweenGlow(
  element: HTMLElement,
  fromHex: string,
  toHex: string,
  duration: number,
): gsap.core.Tween {
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  const proxy = { r: from[0], g: from[1], b: from[2] };
  return gsap.to(proxy, {
    r: to[0],
    g: to[1],
    b: to[2],
    duration,
    ease: "power2.inOut",
    onUpdate: () => {
      element.style.setProperty("--hero-glow", cssRgb([proxy.r, proxy.g, proxy.b]));
    },
  });
}
