import "server-only";

import { CATEGORIES, collections, products as seedProducts, SIZE_CHART, type CatalogProduct } from "@/content/catalog";
import { applyListing, type ListingParams } from "@/lib/catalog/filters";
import type { ProductCardModel } from "@/lib/commerce/types";
import { availabilityMap, catalogProducts, reviewsFor, stockOf } from "@/lib/store/engine";

function cardFrom(product: CatalogProduct, colorwaySlug: string, stock: Record<string, number>): ProductCardModel | null {
  const colorway = product.colorways.find((item) => item.slug === colorwaySlug) ?? product.colorways[0];
  if (!colorway) return null;
  const category = CATEGORIES.find((item) => item.slug === product.category);
  const colorways = product.colorways.map((item) => {
    const sizes = item.variants.map((variant) => ({
      variantId: variant.id,
      sizeUk: variant.sizeUk,
      label: variant.label,
      available: stock[variant.id] ?? 0,
    }));
    return {
      slug: item.slug,
      name: item.name,
      swatch: item.swatch,
      family: item.family,
      image: item.images[0]?.src ?? "",
      pricePaise: item.variants[0]?.pricePaise ?? 0,
      mrpPaise: item.variants[0]?.mrpPaise ?? 0,
      soldOut: sizes.every((size) => size.available <= 0),
      sizes,
    };
  });
  const active = colorways.find((item) => item.slug === colorway.slug) ?? colorways[0];
  if (!active) return null;
  const totalAvailable = active.sizes.reduce((sum, size) => sum + size.available, 0);
  const tags: ProductCardModel["tags"] = [];
  if (product.isNew) tags.push("New");
  if (totalAvailable <= 0) tags.push("Sold out");
  else if (totalAvailable <= 6) tags.push("Last few");
  const secondary = colorway.images.find((image) => image.role === "secondary");
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    subtitle: product.subtitle,
    category: category?.name ?? product.category,
    categorySlug: product.category,
    gender: product.gender,
    colorwaySlug: colorway.slug,
    colorwayName: colorway.name,
    image: colorway.images[0]?.src ?? "",
    secondaryImage: secondary?.src ?? null,
    pricePaise: active.pricePaise,
    mrpPaise: active.mrpPaise,
    tags,
    soldOut: totalAvailable <= 0,
    colorways,
    features: product.features,
    isNew: product.isNew,
  };
}

async function stockFor(list: CatalogProduct[]): Promise<Record<string, number>> {
  const ids = list.flatMap((product) => product.colorways.flatMap((colorway) => colorway.variants.map((variant) => variant.id)));
  return availabilityMap(ids);
}

export async function allCards(): Promise<ProductCardModel[]> {
  const list = await catalogProducts();
  const stock = await stockFor(list);
  return list.flatMap((product) =>
    product.colorways.flatMap((colorway) => {
      const card = cardFrom(product, colorway.slug, stock);
      return card ? [card] : [];
    }),
  );
}

export async function listProducts(params: ListingParams) {
  const cards = await allCards();
  let scoped = cards;
  if (params.collection) {
    const collection = collections.find((item) => item.slug === params.collection);
    const ids = new Set(
      seedProducts.filter((product) => collection?.productSlugs.includes(product.slug)).map((product) => product.id),
    );
    scoped = cards.filter((card) => ids.has(card.productId));
  }
  return applyListing(scoped, params);
}

export async function getNavigation() {
  const cards = await allCards();
  return (["men", "women", "kids"] as const).map((gender) => ({
    gender,
    categories: CATEGORIES.map((category) => ({
      ...category,
      count: cards.filter((card) => card.gender === gender && card.categorySlug === category.slug).length,
    })).filter((category) => category.count > 0),
  }));
}

export async function getProduct(slug: string) {
  const list = await catalogProducts();
  const product = list.find((item) => item.slug === slug && item.isActive);
  if (!product) return null;
  const stock = await stockFor([product]);
  const cards = await allCards();
  const related = cards
    .filter((card) => card.productId !== product.id && (card.categorySlug === product.category || card.gender === product.gender))
    .slice(0, 8);
  const reviews = await reviewsFor(product.id);
  const avg = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const fit = {
    runs_small: reviews.filter((review) => review.fit === "runs_small").length,
    true: reviews.filter((review) => review.fit === "true").length,
    runs_large: reviews.filter((review) => review.fit === "runs_large").length,
  };
  return {
    product,
    stock,
    sizeChart: SIZE_CHART[product.gender],
    reviews,
    reviewSummary: { avg, count: reviews.length, fit },
    related,
    cards: product.colorways.flatMap((colorway) => {
      const card = cardFrom(product, colorway.slug, stock);
      return card ? [card] : [];
    }),
  };
}

export async function getFeatured(kind: "new" | "bestsellers" | "featured"): Promise<ProductCardModel[]> {
  const cards = await allCards();
  if (kind === "new") return cards.filter((card) => card.isNew).slice(0, 10);
  if (kind === "featured") {
    const featured = cards.find((card) => card.slug === "tide-slide" && card.colorwaySlug === "midnight");
    return featured ? [featured] : cards.slice(0, 1);
  }
  return [...cards].sort((a, b) => Number(a.soldOut) - Number(b.soldOut)).slice(0, 4);
}

export async function getCollection(slug: string) {
  const collection = collections.find((item) => item.slug === slug);
  if (!collection) return null;
  const listing = await listProducts({
    sizes: [],
    colors: [],
    features: [],
    sort: "featured",
    page: 1,
    collection: slug,
  });
  return { collection, listing };
}

export async function freshAvailability(variantId: string) {
  return stockOf(variantId);
}

export { CATEGORIES, collections };
