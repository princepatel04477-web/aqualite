/**
 * Generates 3 additional porcelain (#F1EEE8) studio gallery views per colourway
 * (-top.jpg, -sole.jpg, -detail.jpg) from the primary porcelain photograph so
 * every PDP has a 4-image gallery (3/4 profile, angled top profile, sole/heel
 * profile, and upper macro detail). Marked as composite in docs/CLIENT_ASSETS.md.
 */
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const CATALOG_DIR = path.join(ROOT, "public", "catalog");
const PORCELAIN = { r: 241, g: 238, b: 232 }; // --porcelain (#F1EEE8)

const BASES = [
  "tide-slide-midnight",
  "tide-slide-sand",
  "harbour-clog-navy",
  "harbour-clog-fog",
  "reef-flip-white",
  "pearl-slide-blush",
  "pearl-slide-ink",
  "cove-clog-sage",
  "marina-trainer-cloud",
];

const OUT_W = 1024;
const OUT_H = 1280;

async function makeViews(base) {
  const srcPath = path.join(CATALOG_DIR, `${base}.jpg`);
  const meta = await sharp(srcPath).metadata();
  const w = meta.width ?? 1122;
  const h = meta.height ?? 1402;

  // 1. Angled top/side view (-top.jpg): rotated +8deg and scaled on porcelain stage
  const topBuf = await sharp(srcPath)
    .rotate(8, { background: PORCELAIN })
    .resize(OUT_W, OUT_H, { fit: "cover" })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(path.join(CATALOG_DIR, `${base}-top.jpg`));

  // 2. Sole & heel tread closeup (-sole.jpg): lower-right sole/heel crop + subtle -6deg tilt
  const soleCropLeft = Math.round(w * 0.14);
  const soleCropTop = Math.round(h * 0.34);
  const soleCropW = Math.round(w * 0.78);
  const soleCropH = Math.round(h * 0.56);
  await sharp(srcPath)
    .extract({ left: soleCropLeft, top: soleCropTop, width: soleCropW, height: soleCropH })
    .rotate(-6, { background: PORCELAIN })
    .resize(OUT_W, OUT_H, { fit: "contain", background: PORCELAIN })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(path.join(CATALOG_DIR, `${base}-sole.jpg`));

  // 3. Upper & strap macro detail (-detail.jpg): tight crop on the strap/toe box
  const detailLeft = Math.round(w * 0.12);
  const detailTop = Math.round(h * 0.28);
  const detailW = Math.round(w * 0.68);
  const detailH = Math.round(h * 0.52);
  await sharp(srcPath)
    .extract({ left: detailLeft, top: detailTop, width: detailW, height: detailH })
    .resize(OUT_W, OUT_H, { fit: "cover" })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(path.join(CATALOG_DIR, `${base}-detail.jpg`));

  void topBuf;
  console.log(`[gallery-views] generated ${base}-{top,sole,detail}.jpg`);
}

for (const base of BASES) {
  await makeViews(base);
}
