# Aqualite — Ivory & Red design system (v2)

_S01 of the Ivory & Red migration. This document is the source of truth for the
palette, type, shape and component recipes introduced by S01, plus the
migration/alias policy the rest of the series follows._

Principle: warm ivory paper surfaces, near-black warm ink, and **one**
disciplined brand red. Everything else is restraint.

---

## 1. Red discipline (also enforced in AGENTS.md)

**Storefront — red appears only as:**

- the primary CTA (one per section),
- the wordmark,
- the sale price / % off,
- one editorial accent per section (italic phrase set in `--red-ink`, eyebrow counter).

Never: red section backgrounds, red body text.

**Seller Hub — red appears only as:** the top bar, primary actions, active nav
item, and selection tint (`--red-tint`). Errors use `--danger` **with an icon** —
not plain red.

Italic headline phrase = `--red-ink` (replaces the old `--sand` accent).

---

## 2. Palette

All colours live as 8-bit RGB channels in `styles/tokens.css` — the only file
in the repo allowed to contain raw colour values (`npm run tokens:check`
enforces this).

### Surfaces

| Token        | Hex       | Channels       | Role                                   |
| ------------ | --------- | -------------- | -------------------------------------- |
| `--ivory`    | `#FAF6EE` | `250 246 238`  | Page background, default surface       |
| `--paper`    | `#FFFDF9` | `255 253 249`  | Raised: cards, inputs, menus, toasts   |
| `--linen`    | `#F2ECE0` | `242 236 224`  | Secondary: hover fills, table headers  |
| `--porcelain`| `#F1EEE8` | `241 238 232`  | Product image stage                    |
| `--hairline` | `#E3D9C8` | `227 217 200`  | Default borders                        |
| `--rule`     | `#CFC3AF` | `207 195 175`  | Strong borders: inputs, table rules    |

### Text (computed contrast — WCAG 2.1 AA requires 4.5:1)

| Token         | Hex       | on ivory | on paper | on linen | Role                              |
| ------------- | --------- | -------: | -------: | -------: | --------------------------------- |
| `--ink`       | `#1B1714` |    16.52 |    17.53 |    15.14 | Headings, body                    |
| `--ink-2`     | `#4A423B` |     9.13 |     9.69 |     8.37 | Labels, table text                |
| `--muted`     | `#6E655B` |     5.30 |     5.62 |     4.86 | Placeholders, hints, meta         |
| `--red`       | `#C8102E` |     5.46 |     5.79 |     5.00 | CTA fills, wordmark, focus ring   |
| `--red-ink`   | `#A30F26` |     7.34 |     7.79 |     6.73 | Red **as text**: links, sale %    |
| `--success`   | `#1B7148` |     5.56 |     5.90 |     5.10 | Success labels + icons            |
| `--warning`   | `#8F5C00` |     5.27 |     5.59 |     4.83 | Warnings                          |
| `--danger`    | `#B42318` |     6.10 |     6.47 |     5.59 | Errors, destructive (always + icon)|
| `--info`      | `#245B8F` |     6.56 |     6.96 |     6.01 | Neutral process states            |

**Documented deviations from the written spec:** the spec's `--success
#1E7B4F` scores 4.46:1 on linen and `--warning #9A6200` scores 4.33:1 on
linen — both below AA. The ACCEPT gate (≥4.5:1 on all three surfaces) wins,
so success is `#1B7148` and warning is `#8F5C00`. The styleguide shows the
computed values live.

### On-strong + tints

| Token        | Hex       | Pairing                                   |
| ------------ | --------- | ----------------------------------------- |
| `--on-red`   | `#FFFFFF` | Text on `--red` (5.88:1) / `--red-deep` (8.48:1) / `--danger` |
| `--red-deep` | `#9B0D23` | Hover/pressed of `--red`                  |
| `--red-tint` | `#FBEAEC` | Selection fill, brand tint (with `--red-ink` text) |
| `--success-tint` | `#E6F3EC` | Status pill background                |
| `--warning-tint` | `#FDF3DC` | Status pill background                |
| `--danger-tint`  | `#FDECEA` | Status pill background                 |
| `--info-tint`    | `#E8F0F8` | Status pill background                 |

Status pairs (tint text on tint background) all clear AA — shown as computed
rows in the styleguide.

Product swatches (`--swatch-*`) are catalogue data, unchanged by S01.

---

## 3. Type

Two scales, both exposed through tokens:

**Storefront** (unchanged, fluid): `text-hero / display / h1 / h2 / h3 / lead /
body / small / eyebrow / price / size / button / logo / mark` — Instrument
Serif display, Instrument Sans body, JetBrains Mono for eyebrows/ids.

**Seller Hub** (dense, new) — single CSS utilities in `app/globals.css`,
names registered in `lib/cn.ts` for tailwind-merge:

| Utility        | Size / line-height      | Face + notes                          |
| -------------- | ----------------------- | ------------------------------------- |
| `.text-hub-title`   | 28/32             | Instrument Serif, page titles         |
| `.text-hub-section` | 16/22, w600       | Card/section headings                 |
| `.text-hub-body`    | 14/20             | Primary UI copy                       |
| `.text-hub-table`   | 13/18, tabular    | Table cells                           |
| `.text-hub-label`   | 12/16, w500       | Field labels, badges, meta            |
| `.text-hub-id`      | 12/16, mono       | Order/SKU ids                         |
| `.text-hub-kpi`     | 28/32, w600, tabular | Metric numbers                      |

---

## 4. Shape, elevation, density

| Concern        | Tokens                                                        | Usage                                        |
| -------------- | ------------------------------------------------------------- | -------------------------------------------- |
| Radius         | `--radius-panel 2px` (storefront), `--radius-hub 6px` (cards), `--radius-control 4px` (inputs/buttons), `--radius-pill` | `rounded-panel/hub/control/pill`             |
| Elevation      | `--shadow-1` (cards), `--shadow-2` (menus/drawers), `--shadow-3` (tooltips/popovers) | `shadow-1/2/3`                               |
| Density        | `--control-h-compact 32`, `--control-h 36`, `--table-row-compact 36`, `--table-row 44`, `--hub-page-pad 24`, `--hub-grid-gap 16` | consumed as built-ins: `h-8`/`h-9`/`h-11`, `p-6`, `gap-4` |
| Focus ring     | 2px `--red`, 2px offset; **ink ring** on `bg-red` / `bg-danger` fills | global `:focus-visible` in `globals.css`     |
| Motion         | durations/eases unchanged (`--dur-*`, `--ease-*`)             | animations must not flash                    |

---

## 5. Component recipes (S01)

**Button** — variants `primary` (red fill / on-red text / red-deep hover),
`secondary` (paper + rule border, linen hover; legacy `outline` alias),
`ghost`, `danger` (+ icon by the caller), `link` (red-ink, underline draw).
Sizes `sm 32 / md 36 / lg 48`, **default lg** so storefront CTAs keep 48px.
Pressed: `scale .98` + `--red-deep`. Loading keeps width (children invisible
under an overlaid spinner). `radius` prop: panel/control/pill.

**Badge** — pill, tones neutral/brand/success/warning/danger/info (tint
backgrounds, tone text).

**StatusPill** — icon + label, never colour alone. Status → tone map:
Active/Delivered → success; Inactive/Cancelled/Refunded → muted;
Out of stock → danger; Suppressed/Unshipped/Return requested → warning;
Pending/Shipped → info; unknown → muted.

**Card** — paper, hairline, 6px, shadow-1 (flat opt-out).
**Field** — label + hint/error (error in `--danger` with icon).
**Select** — native select, 36px, 4px, rule border, chevron.
**Checkbox** — native, 16px, red fill + white check when checked.
**Switch** — red track when on, linen when off, paper thumb.
**Tabs** — 32px tabs, active = red-tint fill + red-ink text; arrow-key nav.
**Tooltip** — ink surface, ivory text, ≤120ms fade (`--dur-instant`).
**Kbd** — paper key, rule border, mono 12.
**Skeleton** — linen block + `.aq-shimmer` sweep (static under reduced motion).
**EmptyState** — icon disc, title, description, action.
**Banner** — tone tint + tone border + tone icon; `danger` uses `role="alert"`.

---

## 6. Migration & alias policy

`styles/tokens.css` ends with a **temporary alias layer** mapping every
retired Deep Water token to its new counterpart **by role**:

| Old             | → New         | Rationale                                  |
| --------------- | ------------- | ------------------------------------------ |
| `--abyss`       | `--ivory`     | darkest bg → page surface                  |
| `--trench`      | `--paper`     | 2nd surface → raised paper                 |
| `--shelf`       | `--linen`     | hover surface → linen                      |
| `--foam`        | `--ink`       | light text → ink text                      |
| `--mist`        | `--muted`     | 2nd text → muted                           |
| `--aqua`        | `--red-ink`   | accent → red text accent                   |
| `--aqua-deep`   | `--red-deep`  | deep accent → red-deep                     |
| `--sand`        | `--red-ink`   | warm accent → red-ink                      |
| `--ink-on-porcelain` | `--ink`  | stage text → ink                           |

Because both sides of an old pair flip together (dark bg + light text →
light bg + dark text), un-migrated pages stay legible until their prompt
rewrites them. Delete one alias line as soon as its last usage dies.

**`npm run tokens:check`** (`scripts/token-migration-check.ts`):

- scans `app/`, `components/`, `lib/`, `emails/` (missing dirs tolerated) for
  `.ts .tsx .js .jsx .mjs .cjs .css .json .html`;
- prints every alias reference, grouped per file — expected output until S02
  (storefront) and S04 (admin);
- **fails (exit 1) on any raw hex** outside `styles/tokens.css`. Data hex on
  `glowHex` / `haloHex` lines (hero content values, kept by S03) is listed as
  allowed; binary assets (svg/png/ico) are outside the scan — re-theme them
  by hand when their prompt covers them;
- `--strict-storefront` additionally fails on any alias in storefront code
  (admin excluded) — this is the **S02 gate**;
- `--strict` fails on any alias anywhere — the **S04 gate**.

Aliases in `tailwind.config.ts` (class generation) stay until the same gates
pass; the config itself is the class-name bridge, the token file the value
bridge.

---

## 7. Out of scope for S01 (by design)

Page re-theming (S02 storefront, S04 admin), hero imagery + art direction
(S03), OG images/emails (S02), Seller Hub layout/IA (S04+), catalogue
photography, Grain/motion lexicon changes. Existing pages render through the
alias layer until their prompt lands.
