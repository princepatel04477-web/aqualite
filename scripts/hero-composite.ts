/**
 * Hero fallback compositor (H02).
 *
 * For any slide without a photographic/rendered hero source, builds one from
 * the porcelain catalogue photo: background-keyed cutout (the porcelain stage
 * is uniform), composited onto the dark water canvas with the slide's glow,
 * a soft contact shadow and a slight tilt. Emits the same ladder as
 * scripts/hero-images.ts and flags the slide `image_quality: "composite"` in
 * the manifest — the hero shows a dev-only badge for such slides, and they
 * must be replaced before client sign-off.
 *
 * Prototype tool: luminance keying fails on porcelain-white pairs; prefer
 * real photography or the generation pipeline.
 *
 * Run: node --experimental-strip-types scripts/hero-composite.ts [--force <slug>]
 *   Without --force it composites only slides missing a _src/ render.
 *   --out <dir> redirects output (default public/catalog/hero) without
 *   touching the production manifest.
 */
import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";

import {
  DESKTOP_BUDGET_BYTES,
  DESKTOP_WIDTHS,
  MOBILE_BUDGET_BYTES,
  MOBILE_WIDTHS,
  OUT_ROOT,
  ROOT,
  blurPlaceholder,
  encodeLadder,
} from "./hero-lib.ts";

const PORCELAIN: Record<string, string> = {
  "tide-slide": "/catalog/tide-slide-midnight.jpg",
  "pearl-slide": "/catalog/pearl-slide-blush.jpg",
  "cove-clog": "/catalog/cove-clog-sage.jpg",
  "harbour-clog": "/catalog/harbour-clog-navy.jpg",
  "reef-flip": "/catalog/reef-flip-white.jpg",
};

const GLOW: Record<string, string> = {
  "tide-slide": "#1E7F78",
  "pearl-slide": "#B9828C",
  "cove-clog": "#6F9A82",
  "harbour-clog": "#2E4F7F",
  "reef-flip": "#BFA77E",
};

const args = process.argv.slice(2);
function argValue(name: string): string | null {
  const index = args.indexOf(name);
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value) throw new Error(`${name} needs a value.`);
  return value;
}
const forceSlug = argValue("--force");
const outRoot = argValue("--out") ? path.resolve(argValue("--out") as string) : OUT_ROOT;

function backgroundColour(data: Buffer, width: number, height: number, channels: number): [number, number, number] {
  const picks: [number, number, number][] = [];
  for (const [fx, fy] of [
    [0.03, 0.03],
    [0.97, 0.03],
    [0.03, 0.97],
    [0.97, 0.97],
    [0.5, 0.03],
  ] as const) {
    const x = Math.min(width - 1, Math.max(0, Math.floor(width * fx)));
    const y = Math.min(height - 1, Math.max(0, Math.floor(height * fy)));
    const i = (y * width + x) * channels;
    picks.push([data[i] ?? 235, data[i + 1] ?? 235, data[i + 2] ?? 235]);
  }
  const sum = picks.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]], [0, 0, 0]);
  return [sum[0] / picks.length, sum[1] / picks.length, sum[2] / picks.length];
}

/** Luminance/chroma distance key with feathered alpha, trimmed to the shoe. */
async function cutout(file: string): Promise<Buffer> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const [br, bg, bb] = backgroundColour(data, width, height, channels);
  const out = Buffer.alloc(width * height * 4);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let i = 0; i < width * height; i += 1) {
    const j = i * channels;
    const r = data[j] ?? 0;
    const g = data[j + 1] ?? 0;
    const b = data[j + 2] ?? 0;
    const distance = Math.sqrt((r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2);
    const raw = (distance - 14) / (58 - 14); // feather band
    const alpha = Math.max(0, Math.min(1, raw));
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = Math.round(alpha * 255);
    if (alpha > 0.03) {
      const x = i % width;
      const y = Math.floor(i / width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  // Feather the mask itself so edges sit in the water.
  const alphaBlurred = await sharp(out, { raw: { width, height, channels: 4 } })
    .extractChannel(3)
    .blur(1.2)
    .toBuffer();
  const final = Buffer.from(out);
  for (let i = 0; i < width * height; i += 1) {
    final[i * 4 + 3] = alphaBlurred[i] ?? 0;
  }
  const pad = 6;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const cutWidth = Math.min(width - left, maxX - minX + pad * 2);
  const cutHeight = Math.min(height - top, maxY - minY + pad * 2);
  return sharp(final, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: Math.max(1, cutWidth), height: Math.max(1, cutHeight) })
    .png()
    .toBuffer();
}

function canvasSvg(kind: "desktop" | "mobile", glow: string): string {
  const width = kind === "desktop" ? 2560 : 1080;
  const height = kind === "desktop" ? 1440 : 1350;
  const cx = kind === "desktop" ? width * 0.66 : width * 0.5;
  const cy = kind === "desktop" ? height * 0.42 : height * 0.32;
  const radius = kind === "desktop" ? width * 0.3 : width * 0.55;
  const ripples = Array.from({ length: 9 }, (_, i) => {
    const y = Math.round(height * (0.55 + i * 0.05));
    return `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#203236" stroke-width="1" opacity="${(0.05 - i * 0.004).toFixed(3)}" />`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0B1417"/>
      <stop offset="1" stop-color="#07090B"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${glow}" stop-opacity="0.55"/>
      <stop offset="0.45" stop-color="${glow}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${glow}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${radius}" ry="${radius * 0.78}" fill="url(#glow)"/>
  ${ripples}
</svg>`;
}

async function compose(kind: "desktop" | "mobile", slug: string, outDir: string): Promise<Source_ | null> {
  const porcelainPath = path.join(ROOT, "public", PORCELAIN[slug] ?? "");
  if (!fs.existsSync(porcelainPath)) return null;
  const width = kind === "desktop" ? 2560 : 1080;
  const height = kind === "desktop" ? 1440 : 1350;
  const cut = await cutout(porcelainPath);
  const cutMeta = await sharp(cut).metadata();
  // The trimmed shoe must fill ~55–60% of frame width on desktop, ~72vw mobile.
  const targetWidth = Math.round(width * (kind === "desktop" ? 0.57 : 0.72));
  const targetByWidth = {
    width: targetWidth,
    height: Math.round((targetWidth * (cutMeta.height ?? 1)) / (cutMeta.width ?? 1)),
  };
  const targetByHeight = {
    width: Math.round(((height * 0.62) * (cutMeta.width ?? 1)) / (cutMeta.height ?? 1)),
    height: Math.round(height * 0.62),
  };
  const box = kind === "desktop" && targetByWidth.height > targetByHeight.height ? targetByHeight : targetByWidth;
  const shoe = await sharp(cut)
    .resize(box.width, box.height, { withoutEnlargement: false })
    .rotate(kind === "desktop" ? -6 : -4, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const shoeMeta = await sharp(shoe).metadata();

  // Contact shadow: soft dark ellipse under the shoe.
  const shadowWidth = Math.round(shoeMeta.width ?? box.width);
  const shadowHeight = Math.round((shoeMeta.height ?? box.height) * 0.22);
  const shadow = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${shadowWidth}" height="${shadowHeight}">
      <ellipse cx="${shadowWidth / 2}" cy="${shadowHeight / 2}" rx="${shadowWidth * 0.44}" ry="${shadowHeight * 0.42}" fill="#000000" opacity="0.4"/>
    </svg>`,
  );
  const shadowBlur = await sharp(shadow).blur(18).png().toBuffer();

  const cx = kind === "desktop" ? Math.round(width * 0.64) : Math.round(width * 0.5);
  const cy = kind === "desktop" ? Math.round(height * 0.44) : Math.round(height * 0.34);
  const left = Math.max(0, cx - Math.round(shoeMeta.width! / 2));
  const top = Math.max(0, cy - Math.round(shoeMeta.height! / 2));
  const shadowTop = top + (shoeMeta.height ?? 0) - Math.round(shadowHeight * 0.35);

  const canvas = sharp(Buffer.from(canvasSvg(kind, GLOW[slug] ?? "#1E7F78")));
  const composed = canvas
    .composite([
      { input: shadowBlur, left: Math.max(0, left + Math.round(shadowWidth * 0.04)), top: Math.min(height - shadowHeight, shadowTop) },
      { input: shoe, left, top },
    ])
    .jpeg({ quality: 92, mozjpeg: true });

  const outFile = path.join(outDir, "_composite", `${slug}-${kind}.jpg`);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const info = await composed.toFile(outFile);
  return { path: outFile, width: info.width, height: info.height };
}

type Source_ = { path: string; width: number; height: number };

let touched = 0;
for (const slug of Object.keys(PORCELAIN)) {
  if (forceSlug && slug !== forceSlug) continue;
  if (!forceSlug) {
    const hasRender =
      fs.existsSync(path.join(ROOT, "public", "catalog", "hero", "_src", `${slug}-desktop.jpg`)) ||
      fs.existsSync(path.join(ROOT, "public", "catalog", "hero", "_src", `${slug}-desktop.png`));
    if (hasRender) continue;
  }
  touched += 1;
  const outDir = outRoot;
  const desktop = await compose("desktop", slug, outDir);
  const mobile = await compose("mobile", slug, outDir);
  if (!desktop || !mobile) {
    console.error(`[hero-composite] failed for ${slug}`);
    process.exitCode = 1;
    continue;
  }
  if (outRoot !== OUT_ROOT) {
    console.log(`[hero-composite] ${slug}: preview written under ${path.relative(ROOT, outDir)} (production manifest untouched)`);
    continue;
  }
  const ladderDir = path.join(OUT_ROOT, slug);
  const desktopLadder = await encodeLadder(desktop, ladderDir, "hero-desktop", DESKTOP_WIDTHS, 1920, DESKTOP_BUDGET_BYTES);
  const mobileLadder = await encodeLadder(mobile, ladderDir, "hero-mobile", MOBILE_WIDTHS, 828, MOBILE_BUDGET_BYTES);
  console.log(
    `[hero-composite] ${slug}: composited + laddered (desktop ${desktopLadder.widths.join("/")}, mobile ${mobileLadder.widths.join("/")}) — flagged composite; replace before sign-off`,
  );
}

if (touched === 0) {
  console.log("[hero-composite] nothing to do: every slide has a hero source. Use --force <slug> to preview a composite.");
}
