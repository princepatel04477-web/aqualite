# Hero art direction — 5-piece showcase

The approved Tide Slide hero shot (`/catalog/hero-tide-slide.jpg`) is the law.
Every new scene must be indistinguishable from it in angle, scale, light and
mood, so the showcase reads as one campaign. This file is both the generation
brief and the photographer's brief for the client delivery (photography of the
real pairs is preferred for sign-off; AI renders are the prototype stand-in).

## Canvas

- Near-black blue-green background, `#07090B` falling to `#0B1417`. Never pure
  black, never grey. The horizon of "water" is implied, not drawn.
- Desktop: 16:9, 2560×1440 minimum, no visible borders or studio edges.
- Extremely subtle horizontal water ripples / caustic lines, barely above the
  black — if you notice them before the shoe, they are too strong.

## Product

- One shoe only. Large: it fills ~55–60% of the frame width.
- Three-quarter top-down angle, floating, slightly tilted (toe a little high,
  heel a little low — the Tide reference tilts nose-up ~8°).
- Position centre-right: the left 40% of frame stays empty dark water for the
  headline; the right edge holds lead copy. The shoe may kiss the centre line
  but never cross into the left third.
- The shoe must be the REAL product: shape, strap width, perforations,
  footbed texture and colour come from the porcelain catalogue photo of that
  colourway. Any render that invents seams, logos, tread or colourways is
  rejected. No text or logos except the product's own.

## Light

- Soft key from top-left, gentle rim light along the upper edges.
- A coloured volumetric glow directly behind the shoe in the slide's glow
  colour, falling off to black within ~30% of the frame. It is the only
  saturated area in the frame.
- No specular blow-outs, no reflections of studio gear, no hard shadows. A
  faint darker patch under the shoe suggests depth, not a floor.

| # | Scene | Colourway | Glow | Glow hex (data) |
|---|---|---|---|---|
| 01 | Tide Slide | Midnight / Aqua | Deep teal | `#1E7F78` |
| 02 | Pearl Slide | Blush | Blush rose | `#B9828C` |
| 03 | Cove Clog | Sage | Sage green | `#6F9A82` |
| 04 | Harbour Clog | Navy | Deep navy blue | `#2E4F7F` |
| 05 | Reef Flip | Porcelain | Warm sand | `#BFA77E` |

The glow hex lives in `hero_slides.glow_hex` (admin-editable). The image and
the data must agree: `scripts/hero-images.ts` samples the rendered glow's
bright core and reports it in `manifest.json`. Sampled cores for the current
renders — Tide `#57B3BA`, Pearl `#CF918E`, Cove `#829481`, Harbour `#3B4F7F`
family, Reef `#9B8360` — are brighter than the data hexes above, which are
the deeper brand tints the CSS glow layer composites at low alpha. When
re-grading a slide, read the manifest value first, then tune `glow_hex` in
the admin so the page glow and the photograph read as one light.

## Surface

- Realistic EVA foam texture: fine grain, soft micro-highlights, moulded
  seams visible but quiet. Matte, not glossy.
- The footbed texture from the catalogue photo (wavy topographic lines on
  Tide, dotted grain on Pearl) must survive into the render.

## Mobile crop

- 4:5 at 1080×1350, composed separately — never a squeeze of the desktop
  frame. The shoe sits centred in the upper 60%; the lower 40% is near-empty
  dark water so the headline can sit over it.

## Consistency checks (contact sheet, `docs/hero/contact-sheet.png`)

Side by side, all five desktop images must share:

1. identical angle family (±5°),
2. identical apparent scale (shoe ≈ same fraction of frame),
3. identical glow falloff radius,
4. identical darkness at the corners,
5. no visible grain/noise differences between frames.

## Pipeline

Sources go to `public/catalog/hero/_src/<slug>-desktop.(jpg|png)` and
`-mobile.(jpg|png)`. `pnpm hero:images` (scripts/hero-images.ts, sharp) emits
AVIF + WebP at 828/1280/1920/2560 (desktop) and 480/828/1080 (mobile), a
1920 JPEG fallback, 24px blur placeholders, the sampled glow, and
`public/catalog/hero/manifest.json` for the image loader. Budgets: desktop
1920 AVIF ≤ 180 KB, mobile 828 AVIF ≤ 90 KB.

Slides that ship before photography exists may use
`scripts/hero-composite.ts` (porcelain cutout on the dark canvas). Their
manifest entries carry `image_quality: "composite"` and the hero renders a
dev-only badge until they are replaced.
