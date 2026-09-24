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

## M06 — homepage mobile choreography (2026-09-24)

Touch-native replacements shipped (desktop pixels untouched above 1024px):

- **Hero.** Purpose-built mobile subtree (`data-hero="mobile"`, CSS-switched,
  both cheap so no hydration branch): eyebrow → headline (CSS fade/rise 8px,
  `.hero-mline`, no SplitText, no JS needed) → shoe 78vw `fetchPriority=high`
  with `Buoyancy amplitude=2.5 lift mobileOnly` (half amplitude, no sink) →
  one-sentence lead (`firstSentence`) → 48px "Shop men"/"Shop women". The
  4-thumbnail strip is dropped on phones — with it the first viewport
  overflows a 375×667 iPhone SE; without it everything fits. Preloader
  (TideIntro) stays desktop-only; no CircularText/LiquidEther exist in the
  repo — the canvas field is the poster.
- **TideField.** Animated bands/rings now require tier high + reduced off;
  mobile/low/reduced paint one static gradient frame — no rAF loop on the
  first phone viewport.
- **Shop by.** 2×2 porcelain tile grid (aspect 10/11, serif label + mono
  count, press dim), empty categories hidden (M02), Coming soon tile kept.
  Desktop hover index rows render only ≥1024px.
- **New arrivals.** Native snap rail (72vw cards, `scroll-p-page`,
  `overscroll-x-contain`), passive transform-only progress line; "View all"
  is a full-width outline button under the rail (header link desktop-only).
- **Velocity band** (`VelocityBand.tsx`): one row on mobile, velocity 20
  (`--marquee-duration: 20s` <1024px), `data-paused` from an
  IntersectionObserver pauses the CSS animation offscreen; low tier /
  reduced motion render a single static line.
- **Construction.** Swipeable snap deck (78vw cards: porcelain numeral stage,
  number/name/claim/spec), dot indicator + `aria-live` "Layer N of 4";
  desktop scroll-highlight rows gated to `(min-width:1024px) and (hover) and
  (pointer:fine)` — zero ScrollTriggers on touch.
- **Featured drop.** Stacked order kept; feature chips wrap as pills on
  mobile; full-width CTA; mobile-only Buoyancy on the image (no hover sheen).
- **Bestsellers.** 2-col grid + full-width "Shop all" → `/shop` button.
- **Numbers.** Single column with hairline dividers; CountUp runs a Motion
  lifecycle count on mobile (once) — still SSRs the final value.
- **Footer.** Link columns collapse into 48px accordion rows (<1024px);
  newsletter input + button stack full-width; wordmark stays static.

**Motion contract on mobile home:** reveals = Motion whileInView (once,
amount 0.2, y 12→0, `Reveal`), count = Motion lifecycle (`CountUp`), floats =
GSAP tweens gated by the motion policy, marquee = CSS animation with IO
pause. `ScrollTrigger.getAll().length === 0` at 390px is asserted by
`tests/mobile/home.spec.ts` via the `window.__aqScrollTriggerCount()` hook
(exposed from `lib/motion/gsap.ts`).

**Remaining for a real run:** Lighthouse ≥ 90 on home (needs Chrome +
Lighthouse CI — sandbox runs typecheck/vitest only), and a visual diff of
desktop home ≥1024px against `main` (screenshots).
