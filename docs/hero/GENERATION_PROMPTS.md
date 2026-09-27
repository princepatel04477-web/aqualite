# Hero generation prompts

One prompt per product, built from the template below. Attach **both**
reference images when generating:

1. `/catalog/hero-tide-slide.jpg` — the approved scene, as the style frame;
2. the product's porcelain catalogue photo, as the design frame.

Reject any render that invents details (wrong strap shape, added logos,
changed perforation pattern, different hue). Photography of the real pair is
preferred for client delivery; these renders are the prototype stand-in and
must still match the real shoe.

## Template

> Premium footwear campaign still. A single [PRODUCT DESCRIPTION] floating
> above dark still water, three-quarter top-down angle, slight tilt, placed
> centre-right, occupying about 55% of frame width. Deep near-black
> blue-green background, faint horizontal water ripples. Soft [GLOW COLOUR]
> volumetric glow behind the shoe, fading to black. Soft top-left key light,
> subtle rim light, realistic EVA foam texture, crisp detail. Empty dark
> space on the left third for typography. Cinematic, calm, minimal. 16:9,
> 2560×1440. No text, no props, no people, no watermark.

## 02 · Pearl Slide (blush)

Product: blush-pink women's EVA slide, one wide rounded strap, contoured
footbed with fine dotted grain, low-profile sole — exactly as the blush
porcelain photo. Glow: soft blush rose (`#B9828C`), like rose light on mist.

## 03 · Cove Clog (sage)

Product: sage-green women's EVA clog, round ventilation holes across the
vamp, hinged heel strap with a snap button, rocker sole — exactly as the sage
porcelain photo. Glow: soft sage green (`#6F9A82`).

## 04 · Harbour Clog (navy)

Product: deep navy men's EVA clog, round ventilation holes, hinged heel strap
lifted, textured outsole — exactly as the navy porcelain photo. Glow: deep
navy blue (`#2E4F7F`) — dimmer and colder than the others; the shoe reads
almost as a silhouette.

## 05 · Reef Flip (porcelain)

Product: porcelain-white women's flip-flop, Y-toe post, contoured footbed,
thin EVA sole — exactly as the white porcelain photo. Glow: warm sand
(`#BFA77E`).

## Negative list (append to every prompt)

> No second shoe, no pair, no box, no water splashes, no waves, no beach, no
> sand, no text, no logo marks, no watermarks, no people, no hands, no
> mannequin, no reflective studio floor, no lens flare, no vignetting frame,
> no bright horizon, no daylight, no colour gradient bands, no blown
> highlights on foam.

## Mobile 4:5 variant

Reframe each accepted desktop render as a separate 4:5 composition at
1080×1350 (never a squeeze): same shoe, same angle, same glow, shoe centred
in the upper 60% of the frame, lower 40% near-empty dark water with the same
faint ripples. Prompt tail:

> 4:5 vertical, 1080×1350, shoe centred in the upper sixty percent, lower
> part empty dark water, everything else identical to the approved desktop
> scene.

## Acceptance

- Shoe design matches the porcelain photo (shape, strap, holes, hue).
- Composition matches the approved Tide scene (angle, scale, glow falloff).
- No invented details, no text, no props.
- Passes the five-point contact-sheet check in ART_DIRECTION.md.
