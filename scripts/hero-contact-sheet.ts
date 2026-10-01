/**
 * Builds docs/hero/contact-sheet.png: all five desktop hero scenes side by
 * side for the consistency check (angle, scale, glow, darkness) required by
 * docs/hero/ART_DIRECTION.md.
 *
 * Run: node --experimental-strip-types scripts/hero-contact-sheet.ts
 */
import fs from "node:fs";
import path from "node:path";

import sharp, { type OverlayOptions } from "sharp";

import { ROOT } from "./hero-lib.ts";

const PANEL_W = 720;
const PANEL_H = 405;
const LABEL_H = 56;
const COLS = 3;
const PAD = 14;

const SCENES = [
  { label: "01 TIDE SLIDE", file: "public/catalog/hero/tide-slide/hero-desktop-1280.webp" },
  { label: "02 PEARL SLIDE", file: "public/catalog/hero/pearl-slide/hero-desktop-1280.webp" },
  { label: "03 COVE CLOG", file: "public/catalog/hero/cove-clog/hero-desktop-1280.webp" },
  { label: "04 HARBOUR CLOG", file: "public/catalog/hero/harbour-clog/hero-desktop-1280.webp" },
  { label: "05 REEF FLIP", file: "public/catalog/hero/reef-flip/hero-desktop-1280.webp" },
];

const rows = Math.ceil(SCENES.length / COLS);
const sheetW = PAD + COLS * (PANEL_W + PAD);
const sheetH = PAD + rows * (LABEL_H + PANEL_H + PAD);

const composites: OverlayOptions[] = [];
for (const [index, scene] of SCENES.entries()) {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const x = PAD + col * (PANEL_W + PAD);
  const y = PAD + row * (LABEL_H + PANEL_H + PAD);
  const file = path.join(ROOT, scene.file);
  if (!fs.existsSync(file)) {
    console.error(`[contact-sheet] missing ${scene.file} — run scripts/hero-images.ts first`);
    process.exit(1);
  }
  const photo = await sharp(file).resize(PANEL_W, PANEL_H, { fit: "cover" }).toBuffer();
  composites.push({ input: photo, left: x, top: y + LABEL_H });
  const label = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PANEL_W}" height="${LABEL_H}">
      <rect x="0" y="${LABEL_H - 2}" width="${PANEL_W}" height="2" fill="#203236"/>
      <text x="0" y="34" font-family="monospace" font-size="22" letter-spacing="4" fill="#8B959B">${scene.label}</text>
    </svg>`,
  );
  composites.push({ input: label, left: x, top: y });
}

const sheet = sharp({
  create: { width: sheetW, height: sheetH, channels: 3, background: "#07090B" },
}).composite(composites);

const out = path.join(ROOT, "docs", "hero", "contact-sheet.png");
fs.mkdirSync(path.dirname(out), { recursive: true });
await sheet.png().toFile(out);
console.log(`[contact-sheet] written ${path.relative(ROOT, out)} (${sheetW}x${sheetH})`);
