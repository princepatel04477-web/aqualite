import "server-only";

import { unstable_cache } from "next/cache";

import type { HeroSlide } from "@/lib/commerce/types";
import { availabilityMap, catalogProducts, getHeroSlideRows } from "@/lib/store/engine";

/**
 * Joins hero rows with live catalogue data. Prices, names and thumbnails are
 * read from the product colourway at request time — never stored on the slide.
 * Slides whose product is inactive or whose colourway is fully sold out are
 * dropped; the remainder are ordered by `sort`.
 */
async function loadHeroSlides(): Promise<HeroSlide[]> {
  const [rows, products] = await Promise.all([getHeroSlideRows(), catalogProducts()]);
  const now = Date.now();
  const active = rows.filter(
    (row) =>
      row.isActive &&
      (!row.startsAt || Date.parse(row.startsAt) <= now) &&
      (!row.endsAt || Date.parse(row.endsAt) > now),
  );

  const located = active.flatMap((row) => {
    const product = products.find((item) => item.id === row.productId);
    const colorway = product?.colorways.find((item) => item.id === row.colorwayId);
    if (!product || !product.isActive || !colorway) return [];
    return [{ row, product, colorway }];
  });

  const stock = await availabilityMap(
    located.flatMap(({ colorway }) => colorway.variants.map((variant) => variant.id)),
  );

  return located.flatMap(({ row, product, colorway }) => {
    const buyable = colorway.variants.filter((variant) => (stock[variant.id] ?? 0) > 0);
    if (buyable.length === 0) return [];
    const cheapest = buyable.reduce((min, variant) => (variant.pricePaise < min.pricePaise ? variant : min));
    const slide: HeroSlide = {
      id: row.id,
      sort: row.sort,
      eyebrow: row.eyebrow,
      headline: { before: row.headlineBefore, italic: row.headlineItalic, after: row.headlineAfter },
      lead: row.lead,
      glowHex: row.glowHex,
      imageDesktopPath: row.imageDesktopPath,
      imageMobilePath: row.imageMobilePath,
      imageAlt: row.imageAlt,
      focal: { x: row.focalX, y: row.focalY },
      shoeMaskPath: row.shoeMaskPath,
      ctaPrimary: { label: row.ctaPrimaryLabel, href: row.ctaPrimaryHref },
      ctaSecondary: { label: row.ctaSecondaryLabel, href: row.ctaSecondaryHref },
      product: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        colorwayId: colorway.id,
        colorwaySlug: colorway.slug,
        colorwayName: colorway.name,
        pricePaise: cheapest.pricePaise,
        mrpPaise: cheapest.mrpPaise,
        thumbnail: colorway.images[0]?.src ?? "",
        inStock: true,
      },
    };
    return [slide];
  });
}

/** Cached under the "hero" tag (also dropped by catalog edits); 300s ceiling. */
export const getHeroSlides = (): Promise<HeroSlide[]> =>
  unstable_cache(loadHeroSlides, ["hero-slides"], { revalidate: 300, tags: ["hero", "catalog"] })();
