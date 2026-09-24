/**
 * Returns `secondary` with any product+colourway that already appears in
 * `primary` removed, so a page never renders the same item twice
 * (e.g. Bestsellers must not duplicate New Arrivals).
 */
export interface HasSlugAndColourway {
  slug: string;
  colorwaySlug: string;
}

export function excludeOverlap<T extends HasSlugAndColourway>(
  primary: readonly T[],
  secondary: readonly T[],
): T[] {
  const keys = new Set(
    primary.map((item) => `${item.slug}-${item.colorwaySlug}`),
  );
  return secondary.filter(
    (item) => !keys.has(`${item.slug}-${item.colorwaySlug}`),
  );
}
