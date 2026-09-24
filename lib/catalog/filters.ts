import type { ColorFamily, Gender } from "@/content/catalog";
import type { ListingResult, ProductCardModel } from "@/lib/commerce/types";

export const PAGE_SIZE = 24;

export type SortKey = "featured" | "new" | "price-asc" | "price-desc";

export type ListingParams = {
  gender?: Gender;
  category?: string;
  collection?: string;
  sizes: number[];
  colors: ColorFamily[];
  priceMin?: number;
  priceMax?: number;
  features: string[];
  sort: SortKey;
  page: number;
  q?: string;
  view?: "large" | "compact";
  productIds?: string[];
};

const SORTS: SortKey[] = ["featured", "new", "price-asc", "price-desc"];
const GENDERS: Gender[] = ["men", "women", "kids", "unisex"];
const COLORS: ColorFamily[] = ["black", "white", "blue", "grey", "brown", "green", "red", "pink", "beige", "multi"];

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function numbers(value: string | undefined): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((num) => Number.isFinite(num));
}

function tokens(value: string | undefined, allowed: readonly string[]): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => allowed.includes(part));
}

export function parseListing(input: Record<string, string | string[] | undefined>): ListingParams {
  const genderRaw = first(input.gender);
  const sortRaw = first(input.sort);
  const viewRaw = first(input.view);
  const pageRaw = Number(first(input.page) ?? "1");
  const priceMin = Number(first(input.priceMin));
  const priceMax = Number(first(input.priceMax));
  const q = first(input.q)?.trim();
  return {
    gender: genderRaw && GENDERS.includes(genderRaw as Gender) ? (genderRaw as Gender) : undefined,
    category: first(input.category) || undefined,
    collection: first(input.collection) || undefined,
    sizes: numbers(first(input.sizes)),
    colors: tokens(first(input.colors), COLORS) as ColorFamily[],
    priceMin: Number.isFinite(priceMin) ? priceMin : undefined,
    priceMax: Number.isFinite(priceMax) ? priceMax : undefined,
    features: tokens(first(input.features), ["waterproof", "anti-skid", "lightweight", "quick-dry", "cushioned"]),
    sort: sortRaw && SORTS.includes(sortRaw as SortKey) ? (sortRaw as SortKey) : "featured",
    page: Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1,
    q: q || undefined,
    view: viewRaw === "large" || viewRaw === "compact" ? viewRaw : undefined,
  };
}

export function toQuery(params: ListingParams, overrides: Partial<ListingParams> = {}): string {
  const next = { ...params, ...overrides };
  const search = new URLSearchParams();
  if (next.gender && !overrides.gender) {
    /* gender often lives in the path */
  }
  if (next.sizes.length) search.set("sizes", next.sizes.join(","));
  if (next.colors.length) search.set("colors", next.colors.join(","));
  if (next.priceMin !== undefined) search.set("priceMin", String(next.priceMin));
  if (next.priceMax !== undefined) search.set("priceMax", String(next.priceMax));
  if (next.features.length) search.set("features", next.features.join(","));
  if (next.sort !== "featured") search.set("sort", next.sort);
  if (next.page > 1) search.set("page", String(next.page));
  if (next.q) search.set("q", next.q);
  if (next.view) search.set("view", next.view);
  const text = search.toString();
  return text ? `?${text}` : "";
}

function matches(card: ProductCardModel, params: ListingParams, ignore?: keyof ListingParams): boolean {
  if (params.productIds && !params.productIds.includes(card.productId)) return false;
  if (ignore !== "gender" && params.gender && card.gender !== params.gender && card.gender !== "unisex") return false;
  if (ignore !== "category" && params.category && card.categorySlug !== params.category) return false;
  if (ignore !== "colors" && params.colors.length) {
    const family = card.colorways.find((item) => item.slug === card.colorwaySlug)?.family ?? "multi";
    if (!params.colors.includes(family)) return false;
  }
  if (ignore !== "priceMin" && ignore !== "priceMax") {
    if (params.priceMin !== undefined && card.pricePaise < params.priceMin) return false;
    if (params.priceMax !== undefined && card.pricePaise > params.priceMax) return false;
  }
  if (ignore !== "features" && params.features.length && !params.features.every((feature) => card.features.includes(feature as ProductCardModel["features"][number]))) {
    return false;
  }
  if (ignore !== "sizes" && params.sizes.length) {
    const colorway = card.colorways.find((item) => item.slug === card.colorwaySlug);
    const okSize = params.sizes.some((size) => colorway?.sizes.some((row) => row.sizeUk === size && row.available > 0));
    if (!okSize) return false;
  }
  if (ignore !== "q" && params.q) {
    const hay = `${card.name} ${card.subtitle} ${card.category} ${card.colorwayName}`.toLowerCase();
    if (!hay.includes(params.q.toLowerCase())) return false;
  }
  return true;
}

function sortCards(cards: ProductCardModel[], sort: SortKey): ProductCardModel[] {
  const copy = [...cards];
  copy.sort((a, b) => {
    if (sort === "featured" && a.soldOut !== b.soldOut) return a.soldOut ? 1 : -1;
    if (sort === "price-asc") return a.pricePaise - b.pricePaise;
    if (sort === "price-desc") return b.pricePaise - a.pricePaise;
    if (sort === "new") return Number(b.isNew) - Number(a.isNew);
    if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return copy;
}

export function applyListing(cards: ProductCardModel[], params: ListingParams): ListingResult {
  const filtered = sortCards(
    cards.filter((card) => matches(card, params)),
    params.sort,
  );
  const start = (params.page - 1) * PAGE_SIZE;
  const facetSource = (ignore: keyof ListingParams) => cards.filter((card) => matches(card, params, ignore));
  const countBy = (list: ProductCardModel[], pick: (card: ProductCardModel) => string[]): Map<string, number> => {
    const map = new Map<string, number>();
    list.forEach((card) => {
      pick(card).forEach((value) => map.set(value, (map.get(value) ?? 0) + 1));
    });
    return map;
  };
  const sizeCounts = new Map<string, number>();
  facetSource("sizes").forEach((card) => {
    const colorway = card.colorways.find((item) => item.slug === card.colorwaySlug);
    const seen = new Set<number>();
    colorway?.sizes.forEach((size) => {
      if (size.available > 0 && !seen.has(size.sizeUk)) {
        seen.add(size.sizeUk);
        const key = String(size.sizeUk);
        sizeCounts.set(key, (sizeCounts.get(key) ?? 0) + 1);
      }
    });
  });
  const colorCounts = countBy(facetSource("colors"), (card) => {
    const family = card.colorways.find((item) => item.slug === card.colorwaySlug)?.family;
    return family ? [family] : [];
  });
  const categoryCounts = countBy(facetSource("category"), (card) => [card.categorySlug]);
  const featureCounts = countBy(facetSource("features"), (card) => [...card.features]);
  const genderCounts = countBy(facetSource("gender"), (card) => [card.gender]);
  const prices = cards.map((card) => card.pricePaise);
  return {
    items: filtered.slice(start, start + PAGE_SIZE),
    total: filtered.length,
    page: params.page,
    pageSize: PAGE_SIZE,
    facets: {
      sizes: [...sizeCounts.entries()]
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => Number(a.value) - Number(b.value)),
      colors: [...colorCounts.entries()].map(([value, count]) => ({ value, label: value, count })),
      categories: [...categoryCounts.entries()].map(([value, count]) => ({ value, label: value, count })),
      features: [...featureCounts.entries()].map(([value, count]) => ({ value, label: value, count })),
      genders: [...genderCounts.entries()].map(([value, count]) => ({ value, label: value, count })),
      price: {
        min: prices.length ? Math.min(...prices) : 0,
        max: prices.length ? Math.max(...prices) : 0,
      },
    },
  };
}

export function listingHref(
  base: string,
  params: ListingParams,
  overrides: Partial<ListingParams>,
): string {
  const next: ListingParams = { ...params, ...overrides, page: overrides.page ?? 1 };
  const search = new URLSearchParams();
  if (next.sizes.length) search.set("sizes", next.sizes.join(","));
  if (next.colors.length) search.set("colors", next.colors.join(","));
  if (next.priceMin !== undefined) search.set("priceMin", String(next.priceMin));
  if (next.priceMax !== undefined) search.set("priceMax", String(next.priceMax));
  if (next.features.length) search.set("features", next.features.join(","));
  if (next.sort !== "featured") search.set("sort", next.sort);
  if (next.page > 1) search.set("page", String(next.page));
  if (next.q) search.set("q", next.q);
  if (next.view) search.set("view", next.view);
  if (next.gender && base === "/shop") search.set("gender", next.gender);
  if (next.category && !base.includes(`/${next.category}`)) search.set("category", next.category);
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}
