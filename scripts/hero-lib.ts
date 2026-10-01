/**
 * Shared helpers for the hero image pipeline (H02 / R03).
 * Imported by scripts/hero-images.ts and scripts/hero-composite.ts.
 */
import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const SRC_DIR = path.join(ROOT, "public", "catalog", "hero", "_src");
export const OUT_ROOT = path.join(ROOT, "public", "catalog", "hero");
export const DESKTOP_WIDTHS = [828, 1280, 1920];
export const MOBILE_WIDTHS = [480, 828, 1080];
export const DESKTOP_BUDGET_BYTES = 180 * 1024;
export const MOBILE_BUDGET_BYTES = 90 * 1024;

/** Ivory page surface (#FAF6EE) used when flattening JPEG fallbacks. */
export const IVORY_RGB = { r: 250, g: 246, b: 238 };

export type Source = { path: string; width: number; height: number };

export async function sourceOf(kind: "desktop" | "mobile", slug: string): Promise<Source | null> {
  // Prefer transparent PNG composites over legacy JPGs
  for (const ext of ["png", "jpg", "jpeg"]) {
    const file = path.join(SRC_DIR, `${slug}-${kind}.${ext}`);
    if (fs.existsSync(file)) {
      const meta = await sharp(file).metadata();
      return { path: file, width: meta.width ?? 0, height: meta.height ?? 0 };
    }
  }
  return null;
}

function toHex(r: number, g: number, b: number): string {
  const part = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

/**
 * Samples the glow colour from non-transparent shoe pixels.
 */
export async function sampleGlow(file: string): Promise<string> {
  const small = await sharp(file).ensureAlpha().resize(240, null, { withoutEnlargement: true }).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = small.info;
  const data = small.data;
  const scored: { weight: number; r: number; g: number; b: number }[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const a = data[i + 3] ?? 255;
      if (a < 180) continue;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lum = (r + g + b) / 3;
      const sat = max - min;
      if (lum < 25 || lum > 235 || sat < 6) continue;
      scored.push({ weight: sat * lum, r, g, b });
    }
  }
  scored.sort((a, b) => b.weight - a.weight);
  const top = scored.slice(0, Math.max(1, Math.floor(scored.length * 0.08)));
  if (top.length === 0) return "#1E7F78";
  const total = top.reduce((sum, item) => sum + item.weight, 0);
  const sum = top.reduce(
    (acc, item) => ({ r: acc.r + item.r * item.weight, g: acc.g + item.g * item.weight, b: acc.b + item.b * item.weight }),
    { r: 0, g: 0, b: 0 },
  );
  return toHex(sum.r / total, sum.g / total, sum.b / total);
}

export async function encodeLadder(
  source: Source,
  outDir: string,
  baseName: string,
  widths: number[],
  budgetWidth: number,
  budgetBytes: number,
): Promise<{ widths: number[]; formats: string[]; fallback: string | null; bytes: Record<string, number>; withinBudget: boolean }> {
  fs.mkdirSync(outDir, { recursive: true });
  const emitted: number[] = [];
  const bytes: Record<string, number> = {};
  let fallback: string | null = null;
  let fallbackWidth = 0;

  for (const width of widths) {
    if (width > source.width * 1.45) continue;
    emitted.push(width);

    // AVIF preserves alpha channel (transparent canvas)
    let quality = 66;
    for (;;) {
      const file = path.join(outDir, `${baseName}-${width}.avif`);
      const info = await sharp(source.path)
        .resize(width, null, { withoutEnlargement: false })
        .avif({ quality, effort: 4 })
        .toFile(file);
      bytes[`avif:${width}`] = info.size;
      if (info.size <= budgetBytes || quality <= 40) break;
      quality = Math.max(40, quality - 8);
    }

    // WebP preserves alpha channel (transparent canvas)
    const webpFile = path.join(outDir, `${baseName}-${width}.webp`);
    const webpInfo = await sharp(source.path)
      .resize(width, null, { withoutEnlargement: false })
      .webp({ quality: 80, alphaQuality: 90 })
      .toFile(webpFile);
    bytes[`webp:${width}`] = webpInfo.size;

    if (width >= fallbackWidth && width <= 1920) {
      fallbackWidth = width;
    }
  }

  if (fallbackWidth > 0) {
    const jpgFile = path.join(outDir, `${baseName}-${fallbackWidth}.jpg`);
    // Flatten transparent canvas onto Ivory (#FAF6EE) for JPEG fallback
    const jpgInfo = await sharp(source.path)
      .resize(fallbackWidth, null, { withoutEnlargement: false })
      .flatten({ background: IVORY_RGB })
      .jpeg({ quality: 84, mozjpeg: true })
      .toFile(jpgFile);
    bytes[`jpg:${fallbackWidth}`] = jpgInfo.size;
    fallback = `${fallbackWidth}.jpg`;
  }

  const budgetWidthActual = emitted.includes(budgetWidth) ? budgetWidth : (emitted[emitted.length - 1] ?? 0);
  const withinBudget = (bytes[`avif:${budgetWidthActual}`] ?? Number.MAX_SAFE_INTEGER) <= budgetBytes;

  return { widths: emitted, formats: ["avif", "webp"], fallback, bytes, withinBudget };
}

export async function blurPlaceholder(source: Source): Promise<string> {
  const buffer = await sharp(source.path)
    .resize(24, null, { withoutEnlargement: false })
    .flatten({ background: IVORY_RGB })
    .webp({ quality: 40 })
    .toBuffer();
  return `data:image/webp;base64,${buffer.toString("base64")}`;
}
