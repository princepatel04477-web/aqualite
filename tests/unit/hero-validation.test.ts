import { describe, expect, it } from "vitest";

import { heroSeed } from "@/content/hero";
import {
  HERO_ACTIVE_MAX,
  HERO_LEAD_MAX,
  heroRouteError,
  heroSlideInputSchema,
  type HeroSlideInput,
} from "@/lib/validation/hero";

const base: HeroSlideInput = {
  id: "hs_test",
  isActive: true,
  productId: "p_tide_slide",
  colorwayId: "cw_tide_slide_midnight",
  eyebrow: "Monsoon '26",
  headlineBefore: "Light on land.",
  headlineItalic: "At home",
  headlineAfter: " in water.",
  lead: "A quiet strap, a cushioned sole, and a grip that stays honest in the rain.",
  glowHex: "#1E7F78",
  imageDesktopPath: "/catalog/hero-tide-slide.jpg",
  imageMobilePath: "/catalog/hero-tide-slide.jpg",
  imageAlt: "Tide Slide floating over dark water",
  focalX: 0.58,
  focalY: 0.42,
  shoeMaskPath: null,
  ctaPrimaryLabel: "Shop men",
  ctaPrimaryHref: "/shop/men",
  ctaSecondaryLabel: "Shop women",
  ctaSecondaryHref: "/shop/women",
  startsAt: null,
  endsAt: null,
};

describe("heroSlideInputSchema", () => {
  it("accepts a well-formed slide", () => {
    expect(heroSlideInputSchema.safeParse(base).success).toBe(true);
  });

  it("accepts every seeded row (content seed stays in contract)", () => {
    for (const seed of heroSeed) {
      const { key: _key, ...input } = seed;
      const parsed = heroSlideInputSchema.safeParse(input);
      expect(parsed.success, `seed ${seed.key}`).toBe(true);
    }
  });

  it("enforces exactly-one-italic structure (italic phrase required)", () => {
    const broken = { ...base, headlineItalic: "" };
    expect(heroSlideInputSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects glow colours outside #RRGGBB", () => {
    for (const glow of ["1E7F78", "#1E7F7", "#1E7F788", "teal", ""]) {
      const parsed = heroSlideInputSchema.safeParse({ ...base, glowHex: glow });
      expect(parsed.success, glow).toBe(false);
    }
  });

  it("rejects leads over 220 characters", () => {
    const parsed = heroSlideInputSchema.safeParse({ ...base, lead: "w".repeat(HERO_LEAD_MAX + 1) });
    expect(parsed.success).toBe(false);
  });

  it("requires alt text", () => {
    const parsed = heroSlideInputSchema.safeParse({ ...base, imageAlt: "short" });
    expect(parsed.success).toBe(false);
  });

  it("rejects focal points outside 0–1", () => {
    expect(heroSlideInputSchema.safeParse({ ...base, focalX: 1.2 }).success).toBe(false);
    expect(heroSlideInputSchema.safeParse({ ...base, focalY: -0.1 }).success).toBe(false);
  });

  it("rejects schedules that end before they start", () => {
    const parsed = heroSlideInputSchema.safeParse({
      ...base,
      startsAt: "2026-07-01T00:00:00.000Z",
      endsAt: "2026-06-01T00:00:00.000Z",
    });
    expect(parsed.success).toBe(false);
  });

  it("caps active slides at six by contract", () => {
    expect(HERO_ACTIVE_MAX).toBe(6);
  });
});

describe("heroRouteError", () => {
  it("accepts known store routes", () => {
    expect(heroRouteError("/shop/men")).toBeNull();
    expect(heroRouteError("/shop/women")).toBeNull();
    expect(heroRouteError("/shop?category=clogs")).toBeNull();
    expect(heroRouteError("/collections/everyday-slides")).toBeNull();
    expect(heroRouteError("/product/pearl-slide?color=blush")).toBeNull();
    expect(heroRouteError("/product/reef-flip")).toBeNull();
  });

  it("rejects unknown routes and queries", () => {
    expect(heroRouteError("https://elsewhere.example/shop/men")).not.toBeNull();
    expect(heroRouteError("/shop?category=hats")).not.toBeNull();
    expect(heroRouteError("/collections/nope")).not.toBeNull();
    expect(heroRouteError("/unknown")).not.toBeNull();
    expect(heroRouteError("/product/pearl-slide?color=NOT A COLOUR")).not.toBeNull();
  });
});
