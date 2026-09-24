# AQUALITE — MOBILE AUDIT BASELINE

_Measurement-only report (M01). No product code is changed here. Fixes
are owned by M02–M09; the regression gate is M10._

> **Sandbox note:** baseline numbers below are the report template. The
> live Lighthouse + Playwright runs require Playwright browsers and the
> Lighthouse CLI, which run in CI / on a developer machine. Running
> `pnpm mobile:audit` against `BASE_URL` (default the live
> `workers.dev` build, overridable) regenerates this file with real
> device × route data and screenshots under `docs/mobile/screens/`.

## Device matrix

| Project | Viewport | DPR | Engine | Touch |
|---|---|---|---|---|
| budget-android | 360×800 | 2 | Chromium | yes |
| iphone-se | 375×667 | 2 | WebKit | yes |
| iphone-14 | 390×844 | 3 | WebKit | yes |
| pixel-7 | 412×915 | 2.625 | Chromium | yes |

Mobile is defined as viewport < 1024px **OR** `(pointer: coarse)`. The
audit trusts the emulated device, never the user-agent string.

## Routes

`/`, `/shop`, `/shop/men`, `/collections/everyday-slides`,
`/product/tide-slide?color=midnight`, `/bag` (after adding UK 9 via UI),
`/checkout` (with item), `/login`, `/size-guide`, `/track`, and a 404 URL.

## Checks (per route × device)

| # | Check | Method |
|---|---|---|
| a | Horizontal overflow | `getBoundingClientRect().right > innerWidth + 1` or `document.scrollWidth > innerWidth` |
| b | Tap targets | every `a/button/input/[role=button]/summary` ≥ 44×44, centre ≥ 8px clear of neighbours |
| c | Legibility | text < 12px flagged; inputs/selects < 16px flagged (iOS zoom) |
| d | Hover-only affordances | stylesheet `:hover` reveal rules vs currently-hidden matches |
| e | Layout shift | `PerformanceObserver('layout-shift')` during load + 3s idle |
| f | Viewport-unit jump | height == `innerHeight` compared before/after 200px scroll |
| g | Bottom overlaps | fixed/sticky elements overlapping near the bottom edge |
| h | Long tasks | `PerformanceObserver('longtask')` > 50ms in first 5s + fling |
| i | Screenshots | full-page + first-viewport per route × device |

## Baseline Lighthouse (median of 3, mobile emulation)

_Populated by `pnpm mobile:audit`._

| Route | Perf | LCP (ms) | CLS | TBT (ms) |
|---|---|---|---|---|
| / | — | — | — | — |
| /shop/men | — | — | — | — |
| /product/tide-slide | — | — | — | — |
| /checkout | — | — | — | — |

## Issue register

Each issue records: device, evidence (selector / number / screenshot
path), severity (P0 breaks purchase, P1 visibly broken, P2 polish), and
the owning prompt (M02–M09). This section is generated from
`docs/mobile/results/<device>/<route>.json`.

| Issue | Device | Evidence | Severity | Owner |
|---|---|---|---|---|
| _pending run_ | — | — | — | — |

## Summary — top 10 issues

_Populated by the aggregator once data exists, sorted by severity then
device/route coverage._
