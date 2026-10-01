/**
 * Hero fallback compositor (H02 / R03).
 *
 * Takes each porcelain catalogue photo, removes the exterior studio background
 * via border-connected flood-fill + chroma/gradient key (preserving white pairs
 * like Reef Flip without interior holes), places the cutout on a transparent
 * canvas with a slight floating tilt, and emits both _src/<slug>-*.png and the
 * responsive AVIF/WebP/JPEG ladder. The halo (10–14% opacity of the product
 * colour) and soft contact shadow are rendered in CSS.
 *
 * Run: node --experimental-strip-types scripts/hero-composite.ts [--force <slug>]
 */
import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";

import {
  DESKTOP_BUDGET_BYTES,
  DESKTOP_WIDTHS,
  IVORY_RGB,
  MOBILE_BUDGET_BYTES,
  MOBILE_WIDTHS,
  OUT_ROOT,
  ROOT,
  SRC_DIR,
  encodeLadder,
} from "./hero-lib.ts";

const PORCELAIN: Record<string, string> = {
  "tide-slide": "/catalog/tide-slide-midnight.jpg",
  "pearl-slide": "/catalog/pearl-slide-blush.jpg",
  "cove-clog": "/catalog/cove-clog-sage.jpg",
  "harbour-clog": "/catalog/harbour-clog-navy.jpg",
  "reef-flip": "/catalog/reef-flip-white.jpg",
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
    [0.02, 0.02],
    [0.98, 0.02],
    [0.02, 0.98],
    [0.98, 0.98],
    [0.5, 0.02],
  ] as const) {
    const x = Math.min(width - 1, Math.max(0, Math.floor(width * fx)));
    const y = Math.min(height - 1, Math.max(0, Math.floor(height * fy)));
    const i = (y * width + x) * channels;
    picks.push([data[i] ?? 238, data[i + 1] ?? 238, data[i + 2] ?? 236]);
  }
  const sum = picks.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]], [0, 0, 0]);
  return [sum[0] / picks.length, sum[1] / picks.length, sum[2] / picks.length];
}

/**
 * Border-seeded flood-fill background key with feathered alpha, trimmed to the
 * tight shoe bounding box. Flood-filling from the outer edges ensures white
 * shoes (reef-flip) never get interior transparent holes.
 */
async function cutout(file: string, slug: string): Promise<Buffer> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const [br, bg, bb] = backgroundColour(data, width, height, channels);

  const isLightPair = slug === "reef-flip";
  const bgDistLimit = isLightPair ? 7.5 : 22;
  const stepLimit = isLightPair ? 3.5 : 8;

  const visited = new Uint8Array(width * height);
  const isBg = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const pushBorder = (x: number, y: number) => {
    const idx = y * width + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    isBg[idx] = 1;
    queue[tail++] = idx;
  };

  for (let x = 0; x < width; x += 1) {
    pushBorder(x, 0);
    pushBorder(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    pushBorder(0, y);
    pushBorder(width - 1, y);
  }

  const dirs = [-1, 1, -width, width];
  while (head < tail) {
    const curr = queue[head++]!;
    const cx = curr % width;
    const cj = curr * channels;
    const cr = data[cj] ?? 0;
    const cg = data[cj + 1] ?? 0;
    const cb = data[cj + 2] ?? 0;

    for (const d of dirs) {
      const next = curr + d;
      if (next < 0 || next >= width * height) continue;
      if (visited[next]) continue;
      const nx = next % width;
      if (Math.abs(nx - cx) > 1) continue;

      const nj = next * channels;
      const nr = data[nj] ?? 0;
      const ng = data[nj + 1] ?? 0;
      const nb = data[nj + 2] ?? 0;

      const distBg = Math.hypot(nr - br, ng - bg, nb - bb);
      const stepDist = Math.hypot(nr - cr, ng - cg, nb - cb);

      if (distBg <= bgDistLimit && stepDist <= stepLimit) {
        visited[next] = 1;
        isBg[next] = 1;
        queue[tail++] = next;
      }
    }
  }

  const out = Buffer.alloc(width * height * 4);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let i = 0; i < width * height; i += 1) {
    const j = i * channels;
    let r = data[j] ?? 0;
    let g = data[j + 1] ?? 0;
    let b = data[j + 2] ?? 0;

    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const sat = maxC - minC;
    const lum = (r + g + b) / 3;
    const dist = Math.hypot(r - br, g - bg, b - bb);

    // Warm neutral studio floor/shadow tones toward Ivory (#FAF6EE) so shadow
    // edges blend seamlessly with zero grey contour ring.
    if (sat < 10 && lum > 165) {
      const w = Math.max(0, Math.min(1, (lum - 165) / 73));
      r = Math.min(255, Math.round(r + (IVORY_RGB.r - br) * w));
      g = Math.min(255, Math.round(g + (IVORY_RGB.g - bg) * w));
      b = Math.min(255, Math.round(b + (IVORY_RGB.b - bb) * w));
    }

    let alpha = 255;
    if (isBg[i]) {
      alpha = 0;
    } else if (!isLightPair && dist < 24) {
      alpha = Math.round(Math.max(0, Math.min(1, (dist - 8) / 16)) * 255);
    }

    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = alpha;

    if (alpha > 18) {
      const x = i % width;
      const y = Math.floor(i / width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  // Feather the alpha mask edge by 2.2px so the cutout sits seamlessly on ivory.
  const alphaBlurred = await sharp(out, { raw: { width, height, channels: 4 } })
    .extractChannel(3)
    .blur(2.2)
    .toBuffer();
  const final = Buffer.from(out);
  for (let i = 0; i < width * height; i += 1) {
    final[i * 4 + 3] = alphaBlurred[i] ?? 0;
  }

  const pad = 12;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const cutWidth = Math.min(width - left, maxX - minX + pad * 2);
  const cutHeight = Math.min(height - top, maxY - minY + pad * 2);

  return sharp(final, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: Math.max(1, cutWidth), height: Math.max(1, cutHeight) })
    .png()
    .toBuffer();
}

type Source_ = { path: string; width: number; height: number };

async function compose(kind: "desktop" | "mobile", slug: string, outDir: string): Promise<Source_ | null> {
  const porcelainPath = path.join(ROOT, "public", PORCELAIN[slug] ?? "");
  if (!fs.existsSync(porcelainPath)) return null;

  // Transparent canvas framed around the shoe so the shoe container in cols 6-12
  // owns its exact bounding box and CSS renders the halo + contact shadow.
  const width = kind === "desktop" ? 1920 : 1080;
  const height = kind === "desktop" ? 1120 : 960;

  const cut = await cutout(porcelainPath, slug);
  const rotated = await sharp(cut)
    .rotate(kind === "desktop" ? -5 : -4, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const maxShoeWidth = Math.round(width * (kind === "desktop" ? 0.84 : 0.84));
  const maxShoeHeight = Math.round(height * (kind === "desktop" ? 0.82 : 0.78));
  const shoe = await sharp(rotated)
    .resize(maxShoeWidth, maxShoeHeight, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  const shoeMeta = await sharp(shoe).metadata();

  const sw = shoeMeta.width ?? maxShoeWidth;
  const sh = shoeMeta.height ?? maxShoeHeight;
  const left = Math.max(0, Math.round((width - sw) / 2));
  const top = Math.max(0, Math.round((height - sh) / 2));

  // Transparent RGBA canvas — no dark rectangle or vignette!
  const composed = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: shoe, left, top }])
    .png({ compressionLevel: 9 });

  fs.mkdirSync(SRC_DIR, { recursive: true });
  const srcFile = path.join(SRC_DIR, `${slug}-${kind}.png`);
  const info = await composed.toFile(srcFile);

  // Remove legacy dark JPG source if present so hero-images.ts uses the transparent PNG
  const legacyJpg = path.join(SRC_DIR, `${slug}-${kind}.jpg`);
  if (fs.existsSync(legacyJpg)) {
    fs.unlinkSync(legacyJpg);
  }

  // Also update /catalog/hero-tide-slide.jpg fallback on Ivory (#FAF6EE)
  if (slug === "tide-slide" && kind === "desktop" && outDir === OUT_ROOT) {
    await sharp(srcFile)
      .resize(1400, 1000, { fit: "contain", background: { ...IVORY_RGB, alpha: 1 } })
      .flatten({ background: IVORY_RGB })
      .jpeg({ quality: 86, mozjpeg: true })
      .toFile(path.join(ROOT, "public", "catalog", "hero-tide-slide.jpg"));
  }

  return { path: srcFile, width: info.width, height: info.height };
}

for (const slug of Object.keys(PORCELAIN)) {
  if (forceSlug && slug !== forceSlug) continue;
  const desktop = await compose("desktop", slug, outRoot);
  const mobile = await compose("mobile", slug, outRoot);
  if (!desktop || !mobile) {
    console.error(`[hero-composite] failed for ${slug}`);
    process.exitCode = 1;
    continue;
  }
  if (outRoot !== OUT_ROOT) {
    console.log(`[hero-composite] ${slug}: preview written under ${path.relative(ROOT, outRoot)}`);
    continue;
  }
  const ladderDir = path.join(OUT_ROOT, slug);
  const desktopLadder = await encodeLadder(desktop, ladderDir, "hero-desktop", DESKTOP_WIDTHS, 1920, DESKTOP_BUDGET_BYTES);
  const mobileLadder = await encodeLadder(mobile, ladderDir, "hero-mobile", MOBILE_WIDTHS, 828, MOBILE_BUDGET_BYTES);
  console.log(
    `[hero-composite] ${slug}: transparent cutout + ladder (desktop ${desktopLadder.widths.join("/")}, mobile ${mobileLadder.widths.join("/")})`,
  );
}
