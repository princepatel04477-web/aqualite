# Hero Showcase — Sign-off Record (H01–H06)

Five-scene home showcase: **01 Tide Slide · 02 Pearl Slide · 03 Cove Clog · 04 Harbour Clog · 05 Reef Flip**, replicating the approved single-scene hero (Tide Slide floating over dark water, teal glow, split serif headline with one italic phrase, price block bottom-left, thumbnail strip bottom-centre, SCROLL cue bottom-right) — nothing redesigned, multiplied from server data.

## Status

| Prompt | Scope | Commit |
| --- | --- | --- |
| H01 | Data + admin: `hero_slides` model (sort/is_active/schedule; **price & name never stored** — read live from cheapest in-stock variant), RLS (public SELECT active+in-window, admin-only writes, ≤6-active trigger), seed of 5 drafts, `getHeroSlides()` server-only (cache tag `hero`, 300 s, admin saves revalidate), `/admin/hero` reorder/toggle/schedule + editor, media upload API | `a9f0d8f` |
| H02 | Art direction: 4 new desktop scenes + separate 4:5 mobiles, responsive AVIF/WebP/JPEG ladders + manifest (`lib/catalog/hero-manifest.ts`, generated), composite fallback + contact sheet (`docs/hero/ART_DIRECTION.md`, `docs/hero/CONTACT_SHEET.md`) | `3c6ee34` |
| H03 | Carousel core: `heroMachine` (pure, unit-tested), `useHeroController`, `HeroScene` backdrop/content stacks (CLS 0 via `.grid-area-stack`), SSR of slide 01 with the LCP image as a plain `<img fetchPriority="high">`, APG carousel semantics, 44 px Pause, polite live region on manual nav, ←/→/Home/End, reduced-motion via `useMotionPolicy` | `289ceba` |
| H04 | Scene-change system: `createSceneTransition` GSAP timeline — high (wave wipe + glow morph + SplitText out/in + eyebrow scramble), medium (crossfade, shoe motion kept), reduced/low (0.25 s crossfade); fully interruptible; stale `TRANSITION_DONE` guarded index-matched in the machine | `8333ec8` |
| H05 | Commerce band: thumbnail rail (tablist + shared-layout indicator + autoplay progress line + 250 ms hover preload + full untruncated names), price block (rolling price, struck MRP + % off **only when discounted**, Quick add size popover → `useCart().add` with Splash-to-Bag fly, sold-out sizes respected), "01 — 05" rolling counter + Pause/Play + SCROLL cue, per-slide CTA labels with widths reserved to the widest label | `aadfba0` |
| H06 | Mobile + QA gate: <1024 px stacked scene (eyebrow + "02 — 05" → 4:5 mobile image ~70 vw over the glow → headline → price line "PEARL SLIDE · ₹449 · Quick add" → first-sentence lead → side-by-side 48 px CTAs → below-fold 5×56 px snap thumbs, mono 10 px active name), Motion-only transition tier (out x−24 fade .25 s / in x+24 fade .35 s, shoe rise 12 px → half-amp float, glow via CSS `--hero-glow` morph .4 s, **no wave wipe, no filters, no GSAP**), swipe (Motion drag x, 16 px intent, 25 % commit, `touch-action: pan-y`, wrap on), autoplay 6 s mobile / 7 s desktop, paused while touching + 20 s after release, only slide 1 eager, UA-based SSR of the mobile tree, desktop engine (GSAP) split into a lazily-loaded chunk phones never fetch | this commit |

## Environment constraints (this sandbox)

- **No Supabase project** — migrations are inspection-verified only (H01); the store runs on the local commerce engine (`.data/store.json`).
- **Playwright browsers cannot be installed** (TLS/mirror failures) — every browser-based ACCEPT item is CI-deferred. Not retried per instruction.
- **`next build` is blocked** by the Google Fonts fetch in `app/fonts.ts` (no egress) — bundle-size and Lighthouse numbers cannot be produced locally.

## Gates run (final tree, H06)

| Gate | Result |
| --- | --- |
| `pnpm typecheck` (`tsc --noEmit`) | clean |
| `pnpm lint` (`next lint`) | clean — no warnings/errors |
| `pnpm test` (vitest, isolated store) | **47/47** — pricing 6 · hero-validation 11 · hero-store 5 · hero-machine 25 |
| SSR `/` desktop | 200 — stacked scenes, `grid-area-stack`, band, 5 tabs, counter "01 — 05", per-slide CTAs |
| SSR `/` mobile UA (iPhone) | 200 — `data-hero-mobile` tree, no desktop stack, compact snap tablist (5 tabs), price line, 48 px CTA grid, first-sentence lead, glow layer, **no wave clip**, only the slide-1 mobile image eager with `fetchPriority="high"` |
| Product page regression | 200 |
| H06 machine tests | all 20 from→to pairs land `idle(to)` after `complete()` under **both** cadences (7 s/6 s), with transitioning-state, cooldown and pause assertions; `touching` pause + `noteInteraction()` cooldown contract |

### H06 static GSAP audit (showcase JS budget)

The mobile showcase chain — `HeroShowcase` (shell) → `HeroMobileScene` / `HeroScene` / `HeroThumbRail` / `HeroPriceBlock` / `HeroCounter` / `HeroCtas` / `HeroLiveRegion` / `useHeroController` / `heroMachine` — imports **zero** GSAP. All GSAP behaviour lives in `HeroDesktopEngine`, loaded via `next/dynamic({ ssr: false })` as its own chunk (verified in `.next/static/chunks/`) and never fetched for the mobile tree. Reduced-motion/low-tier desktops still load the engine chunk but run only the 0.25 s crossfade path.

**Flagged (outside hero file ownership):** page-level components from earlier prompts — `TideIntro`, `SmoothScroll`, `Header`, `HeroStage` (zero-slide fallback), `Anatomy`/`Campaign`/`ShopIndex`/`CountUp`/`Reveal`/`RiseGrid`/`WetInk`, `pdp/FrameIn` — still import GSAP statically and therefore ship GSAP in the home-page bundle on phones. Converting those to policy-gated dynamic imports belongs to the prompt that owns the page shell / motion pack; the hero's ≤12 KB showcase budget is met at the showcase boundary.

## CI-deferred checks (require browsers/build — not runnable here)

1. Playwright suites at 1440 + 390: autoplay advance, pause, thumb navigation, swipe, rapid navigation, quick-add flow, axe (0 serious), no horizontal overflow.
2. Visual snapshots: 5 scenes × 2 viewports with animations disabled.
3. Lighthouse mobile Performance ≥ 90; showcase JS ≤ 12 KB gz measured on built output.
4. H05 no-overlap screenshot pass at 1024 / 1280 / 1440 / 1920 / 2560.
5. H01 migration apply against a real Supabase project.
6. H02 composite slides replaced by final renders (currently flagged `composite` in the manifest).

## Known limitations / documented decisions

- Autoplay cadence (7 s/6 s) is fixed at first render from the user agent; a mid-session resize across 1024 px swaps the layout tree and rebuilds the machine (returns to slide 01). Chosen to keep the machine deterministic and unit-testable.
- UA mismatch (e.g. desktop UA in a <1024 px window): the desktop tree shows until the post-mount media-query sync swaps to the mobile tree — one reflow, first paint only.
- `@property --hero-glow` interpolates the glow in Chromium/Safari/Firefox-modern; older engines fall back to an instant glow swap (verified graceful by construction — the transition simply doesn't interpolate).
- The mobile transition follows the spec's fixed out x−24 / in x+24 vector regardless of travel direction (verbatim H06 reading).
- `headers()` in the home page opts it out of static revalidation; hero data itself remains cached under the `hero` tag for 300 s.
- Mobile swipe lives on the content column only, so the horizontal thumb snap-row keeps native scrolling.
