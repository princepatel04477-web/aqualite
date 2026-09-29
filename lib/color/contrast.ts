/** WCAG 2.x relative luminance + contrast ratio maths.
 *  Inputs are raw 8-bit RGB triples (the same channel form the token file
 *  stores), so every caller reads colours from tokens — never literals. */

export type Rgb = readonly [number, number, number];

/** Parse "#RRGGBB" (or "#RGB") data colours such as hero glowHex values. */
export function hexToRgb(hex: string): Rgb | null {
  const match = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex.trim());
  const captured = match?.[1];
  if (!captured) return null;
  let digits = captured;
  if (digits.length === 3) {
    digits = digits
      .split("")
      .map((char) => char + char)
      .join("");
  }
  return [
    parseInt(digits.slice(0, 2), 16),
    parseInt(digits.slice(2, 4), 16),
    parseInt(digits.slice(4, 6), 16),
  ];
}

/** WCAG 2.1 relative luminance of an sRGB colour. */
export function relativeLuminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio between two colours (1 … 21). */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [lighter, darker] = la >= lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Channels of a CSS custom property as held by tokens.css ("27 23 20").
 *  Returns null during SSR (no document). */
export function readTokenChannels(name: string): Rgb | null {
  if (typeof document === "undefined") return null;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = raw.split(/[\s,]+/).map(Number);
  if (parts.length >= 3 && parts.every((part) => Number.isFinite(part))) {
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
  }
  return null;
}
