import { z } from "zod";

import { CATEGORIES, collections } from "@/content/catalog";

/** Hero glow colours are stored as data and applied through a CSS variable. */
export const HERO_GLOW_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/** Headline lead copy ceiling (hard limit from the H01 brief). */
export const HERO_LEAD_MAX = 220;

/** At most six slides may be active at once — mirrored by a DB trigger. */
export const HERO_ACTIVE_MAX = 6;

const assetPath = z
  .string()
  .min(1)
  .max(400)
  .regex(/^\/[A-Za-z0-9_\-./]+$/, "Image paths must be site-absolute.");

const scheduleValue = z.string().datetime({ offset: true }).nullable();

export const heroSlideInputSchema = z
  .object({
    id: z.string().min(1).max(80).optional(),
    isActive: z.boolean(),
    productId: z.string().min(1).max(80),
    colorwayId: z.string().min(1).max(120),
    eyebrow: z.string().min(2).max(40),
    headlineBefore: z.string().max(80),
    headlineItalic: z.string().min(1).max(48),
    headlineAfter: z.string().max(80),
    lead: z.string().min(20).max(HERO_LEAD_MAX),
    glowHex: z.string().regex(HERO_GLOW_PATTERN, "Glow must be a #RRGGBB hex colour."),
    imageDesktopPath: assetPath,
    imageMobilePath: assetPath,
    imageAlt: z.string().min(8).max(200),
    focalX: z.number().min(0).max(1),
    focalY: z.number().min(0).max(1),
    shoeMaskPath: assetPath.nullable(),
    ctaPrimaryLabel: z.string().min(2).max(28),
    ctaPrimaryHref: z.string().min(1).max(300).regex(/^\//, "CTA links must be site-absolute."),
    ctaSecondaryLabel: z.string().min(2).max(28),
    ctaSecondaryHref: z.string().min(1).max(300).regex(/^\//, "CTA links must be site-absolute."),
    startsAt: scheduleValue,
    endsAt: scheduleValue,
  })
  .refine(
    (input) => !input.startsAt || !input.endsAt || input.startsAt < input.endsAt,
    { message: "The schedule must start before it ends.", path: ["endsAt"] },
  );

export type HeroSlideInput = z.infer<typeof heroSlideInputSchema>;

/** Stored row — what the engine (and, after cutover, the table) returns. */
export type HeroSlideRow = {
  id: string;
  sort: number;
  isActive: boolean;
  productId: string;
  colorwayId: string;
  eyebrow: string;
  headlineBefore: string;
  headlineItalic: string;
  headlineAfter: string;
  lead: string;
  glowHex: string;
  imageDesktopPath: string;
  imageMobilePath: string;
  imageAlt: string;
  focalX: number;
  focalY: number;
  shoeMaskPath: string | null;
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  ctaSecondaryLabel: string;
  ctaSecondaryHref: string;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
};

const GENDERS = ["men", "women", "kids"] as const;

/**
 * Validates a hero CTA href against routes that actually exist in the store,
 * including query forms (`/product/<slug>?color=<slug>`, `/shop?category=…`).
 * Returns the reason a route is unknown, or null when it resolves.
 */
export function heroRouteError(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href, "http://aqualite.invalid");
  } catch {
    return "Not a valid URL.";
  }
  if (url.origin !== "http://aqualite.invalid") return "CTA links must stay on the site.";
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const category = url.searchParams.get("category");
  const color = url.searchParams.get("color");

  switch (true) {
    case path === "/":
      return null;
    case path === "/shop":
      if (!category || !CATEGORIES.some((item) => item.slug === category)) {
        return "/shop needs a known ?category= value.";
      }
      return null;
    default:
      break;
  }

  const shopGender = /^\/shop\/(men|women|kids)$/.exec(path);
  if (shopGender) return null;

  const collection = /^\/collections\/([a-z0-9-]+)$/.exec(path);
  if (collection) {
    return collections.some((item) => item.slug === collection[1])
      ? null
      : `Unknown collection “${collection[1]}”.`;
  }

  const product = /^\/product\/([a-z0-9-]+)$/.exec(path);
  if (product) {
    if (color !== null && !/^[a-z0-9-]*$/.test(color)) return "Unknown colourway query.";
    return null; // Product existence is checked server-side against the catalogue.
  }

  if (GENDERS.some((gender) => path === `/${gender}`)) return null;
  return `No store route matches “${href}”.`;
}
