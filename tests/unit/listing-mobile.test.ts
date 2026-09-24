import { describe, expect, it } from "vitest";

import {
  applyListing,
  listingHref,
  type ListingParams,
} from "@/lib/catalog/filters";
import { swatchDots } from "@/lib/catalog/swatches";
import type { ProductCardModel } from "@/lib/commerce/types";

function makeCard(overrides: Partial<ProductCardModel> = {}): ProductCardModel {
  const sizes = (uk: number, available: number) =>
    [6, 7, 8, 9].map((sizeUk) => ({
      variantId: `${overrides.slug ?? "card"}-${uk}-${sizeUk}`,
      sizeUk,
      label: String(sizeUk),
      available: sizeUk === uk ? available : 1,
    }));
  return {
    productId: "p1",
    slug: "card",
    name: "Card",
    subtitle: "",
    category: "Slides",
    categorySlug: "slides",
    gender: "men",
    colorwaySlug: "midnight",
    colorwayName: "Midnight",
    image: "/catalog/tide-slide-midnight.jpg",
    secondaryImage: null,
    pricePaise: 129900,
    mrpPaise: 259900,
    tags: [],
    soldOut: false,
    isNew: false,
    features: ["waterproof"],
    colorways: [
      {
        slug: "midnight",
        name: "Midnight",
        swatch: "black",
        family: "black",
        image: "/catalog/tide-slide-midnight.jpg",
        pricePaise: 129900,
        mrpPaise: 259900,
        soldOut: false,
        sizes: sizes(8, 3),
      },
    ],
    ...overrides,
  };
}

const baseParams: ListingParams = {
  sizes: [],
  colors: [],
  features: [],
  sort: "featured",
  page: 1,
};

describe("swatchDots (M07 colour dots, max 3 + “+N”)", () => {
  const dots = (count: number) =>
    Array.from({ length: count }, (_, index) => ({ slug: `c${index}` }));

  it("caps the dots at three and counts the overflow", () => {
    const result = swatchDots(dots(5));
    expect(result.shown).toHaveLength(3);
    expect(result.extra).toBe(2);
  });

  it("reports no overflow at or under three", () => {
    expect(swatchDots(dots(3)).extra).toBe(0);
    expect(swatchDots(dots(2)).shown).toHaveLength(2);
  });
});

describe("listingHref (M07 shareable filter URLs)", () => {
  it("encodes sizes, colours and sort, and resets the page", () => {
    const params: ListingParams = {
      ...baseParams,
      sizes: [8],
      colors: ["blue"],
      sort: "price-asc",
      page: 3,
    };
    const href = listingHref("/shop/men", params, { page: 1 });
    expect(href).toContain("/shop/men?");
    expect(href).toContain("sizes=8");
    expect(href).toContain("colors=blue");
    expect(href).toContain("sort=price-asc");
    expect(href).not.toContain("page=");
  });

  it("keeps the base clean when nothing is set", () => {
    expect(listingHref("/shop", baseParams, {})).toBe("/shop");
  });
});

describe("applyListing live counts (M07 filter sheet)", () => {
  const midnight = makeCard().colorways[0];
  const blush = {
    slug: "blush",
    name: "Blush",
    swatch: "pink",
    family: "pink" as const,
    image: "/catalog/pearl-slide-blush.jpg",
    pricePaise: 79900,
    mrpPaise: 159900,
    soldOut: false,
    sizes: [6, 7, 8, 9].map((sizeUk) => ({
      variantId: `b-${sizeUk}`,
      sizeUk,
      label: String(sizeUk),
      available: sizeUk === 8 ? 0 : 1,
    })),
  };
  if (!midnight) throw new Error("fixture colorway missing");
  const scope = [
    makeCard({
      productId: "a",
      slug: "a",
      pricePaise: 129900,
      colorways: [midnight],
    }),
    makeCard({
      productId: "b",
      slug: "b",
      pricePaise: 79900,
      mrpPaise: 159900,
      colorwaySlug: "blush",
      colorwayName: "Blush",
      image: blush.image,
      colorways: [blush],
    }),
  ];

  it("counts only cards with the chosen size in stock", () => {
    expect(applyListing(scope, { ...baseParams, sizes: [8] }).total).toBe(1);
    expect(applyListing(scope, { ...baseParams, sizes: [7] }).total).toBe(2);
  });

  it("counts only cards inside the price band", () => {
    expect(
      applyListing(scope, { ...baseParams, priceMin: 0, priceMax: 99900 })
        .total,
    ).toBe(1);
  });

  it("counts colour families from the active colourway", () => {
    expect(applyListing(scope, { ...baseParams, colors: ["pink"] }).total).toBe(
      1,
    );
  });
});
