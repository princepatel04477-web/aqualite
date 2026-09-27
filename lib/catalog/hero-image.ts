import { HERO_MEDIA, type HeroMediaEntry } from "@/lib/catalog/hero-manifest";

export type HeroImageSpec = {
  /** Extensionless ladder base, e.g. /catalog/hero/pearl-slide/hero-desktop */
  base: string | null;
  avifSrcSet: string | null;
  webpSrcSet: string | null;
  /** JPEG fallback URL (always a real file when a ladder exists). */
  fallback: string | null;
  sizes: string;
  placeholder: string;
  aspect: number | null;
  /** "composite" slides carry a dev-only badge until replaced. */
  quality: "render" | "composite" | "raw";
};

const DESKTOP_SIZES = "(max-width: 1023px) 118vw, 1180px";
const MOBILE_SIZES = "(max-width: 1023px) 88vw, 520px";

function fromEntry(entry: HeroMediaEntry, sizes: string): HeroImageSpec {
  const srcSet = (format: string) =>
    entry.widths.map((width) => `${entry.base}-${width}.${format} ${width}w`).join(", ");
  return {
    base: entry.base,
    avifSrcSet: entry.formats.includes("avif") ? srcSet("avif") : null,
    webpSrcSet: entry.formats.includes("webp") ? srcSet("webp") : null,
    fallback: entry.fallback,
    sizes,
    placeholder: entry.blurDataURL,
    aspect: entry.aspect,
    quality: entry.quality,
  };
}

/**
 * Resolves a hero slide's stored image paths (H01 data) against the
 * generated media manifest (H02 pipeline). Falls back to the raw path when
 * no ladder exists yet — e.g. a fresh admin upload before the pipeline run.
 */
export function heroImage(desktopPath: string, mobilePath: string, kind: "desktop" | "mobile"): HeroImageSpec {
  const path = kind === "desktop" ? desktopPath : mobilePath;
  const entry = HERO_MEDIA[path];
  if (entry) return fromEntry(entry, kind === "desktop" ? DESKTOP_SIZES : MOBILE_SIZES);
  return {
    base: null,
    avifSrcSet: null,
    webpSrcSet: null,
    fallback: path,
    sizes: kind === "desktop" ? DESKTOP_SIZES : MOBILE_SIZES,
    placeholder: "",
    aspect: null,
    quality: "raw",
  };
}

/** Warms the browser cache for a slide's hero image (H05 hover, H06 idle). */
export function preloadHeroImage(
  desktopPath: string,
  mobilePath: string,
  kind: "desktop" | "mobile" = "desktop",
): void {
  const spec = heroImage(desktopPath, mobilePath, kind);
  const src = spec.fallback ?? (kind === "desktop" ? desktopPath : mobilePath);
  if (typeof window === "undefined" || !src) return;
  const image = new Image();
  image.src = src;
}
