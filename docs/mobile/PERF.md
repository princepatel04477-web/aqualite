# AQUALITE — MOBILE PERFORMANCE (M04)

Strategy and measurement notes for the mobile performance work. The
before/after numbers are produced by CI (Lighthouse mobile emulation +
a bundle analysis) — they are placeholders until a run populates them.

## What changed (this commit)

- **Lenis is no longer downloaded on touch.** `SmoothScroll` already
  dynamically imported `lenis` and gated it on `reduced || tier === "low"`,
  but it still loaded on phones (where `syncTouch:false` only disabled
  smoothing). It now bails out for `(pointer: coarse)`, so mobile uses
  native scrolling and never ships the Lenis chunk.
- **Caching headers** (`public/_headers`): hashed `/_next/static/*`,
  `/assets/*` and versioned `/catalog/*` are served `immutable`
  (1y). No blanket HTML cache, so `/bag`, `/checkout`, `/account`,
  `/order` are never cached.
- **Below-fold render skipping** (`.cv-auto` = `content-visibility:auto`
  + `contain-intrinsic-size`): applied to the home marquee band and the
  stats band so they cost nothing until near the viewport.
- **Image loading hints**: below-fold imagery is `loading="lazy"`
  (product cards, Shop-index hover tile, PDP secondary gallery); the PDP
  primary image is `fetchPriority="high"` (it is the LCP).
- **Fonts**: `next/font` with `display:swap`; serif 400 + italic and
  sans 400/500 preloaded. (`adjustFontFallback` keeps CLS at 0 on swap.)

## Still to do (recommended, validated in CI)

- **Responsive image pipeline.** Catalogue is served as raw
  `/catalog/*.jpg`. A custom `next/image` loader (Cloudflare Image
  Resizing via `/cdn-cgi/image/...` if the zone supports it, or
  build-time `sharp` variants AVIF/WebP at 320–1440w) plus correct
  `sizes` on every image, is the biggest remaining LCP/byte win. The
  current `<img>` tags should move to `next/image` with `sizes`:
  cards `(max-width:767px) 50vw, (max-width:1279px) 33vw, 25vw`, PDP
  gallery `100vw`, hero `100vw`.
- **Heavy animation gating.** `WetInk` (headline reveal) should fall back
  to a Motion line fade on mobile/low tier; `Buoyancy`'s scroll "sink"
  timeline and `TideField` canvas should pause when offscreen / tab
  hidden. These already respect `useMotionPolicy` (`tier`, `reduced`), but
  the offscreen/hidden pause loop is not yet wired.
- **First-load JS budget (≤ 160 KB gz on home/PLP/PDP).** Re-run
  `npx @next/bundle-analyzer` (or `next build` + `npx bundlesize`) and
  record numbers below.

## Numbers (fill from a mobile Lighthouse + bundle run)

| Route | First-load JS (gz) | Image bytes (above fold) | LCP | CLS | TBT |
|---|---|---|---|---|---|
| / | — | — | — | — | — |
| /shop/men | — | — | — | — | — |
| /product/tide-slide | — | — | — | — | — |

Target (from the prompt): Performance ≥ 90, LCP < 2.2s, CLS < 0.05,
TBT < 200ms on simulated Moto G Power / 4G.
