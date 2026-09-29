import { z } from "zod";
import { APPROVED_FEATURES, COLOR_FAMILIES, CATEGORIES, GENDERS, SIZE_CHART, type CatalogProduct } from "@/content/catalog";

const slug = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);
const image = z.object({ src: z.string().max(500).regex(/^\/api\/media\/catalog-[a-zA-Z0-9-]+\.webp$|^https:\/\/[a-zA-Z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\/catalog\//), alt: z.string().max(200), role: z.enum(["primary", "secondary", "detail", "sole", "on_foot"]), width: z.number().int().positive(), height: z.number().int().positive() });
const offer = z.object({ sizeUk: z.number().positive(), sku: z.string().trim().regex(/^[A-Z0-9-]{3,60}$/), mrpPaise: z.number().int().nonnegative(), pricePaise: z.number().int().nonnegative(), stock: z.number().int().nonnegative() });
const colorway = z.object({ id: z.string().uuid(), name: z.string().min(1).max(60), slug, swatch: z.string().regex(/^[a-z-]+$/), family: z.enum(COLOR_FAMILIES), sizes: z.array(z.number().positive()).max(30), offers: z.array(offer).max(30), images: z.array(image).max(16) });

export const draftSchema = z.object({
  id: z.string().uuid(),
  isActive: z.literal(false),
  name: z.string().max(120), slug: z.string().max(80),
  category: z.enum(CATEGORIES.map((row) => row.slug) as [typeof CATEGORIES[number]["slug"], ...typeof CATEGORIES[number]["slug"][]]),
  gender: z.enum(GENDERS), subtitle: z.string().max(200),
  materialUpper: z.string().max(120), materialSole: z.string().max(120),
  features: z.array(z.enum(APPROVED_FEATURES)).max(5), hsn: z.string().regex(/^\d{0,8}$/),
  colorways: z.array(colorway).max(12),
  description: z.string().max(10000), care: z.string().max(2000),
  keywords: z.array(z.string().trim().max(50)).max(24),
  seoTitle: z.string().max(120), seoDescription: z.string().max(300),
  step: z.number().int().min(0).max(5),
});
export type ProductDraft = z.infer<typeof draftSchema>;

export const STEPS = ["Vital information", "Variations", "Offer", "Images", "Description & search", "Review"] as const;

export function newDraft(): ProductDraft {
  return { id: crypto.randomUUID(), isActive: false, name: "", slug: "", category: "slides", gender: "men", subtitle: "", materialUpper: "", materialSole: "", features: [], hsn: "", colorways: [], description: "", care: "", keywords: [], seoTitle: "", seoDescription: "", step: 0 };
}

export function stepError(draft: ProductDraft, step: number): string | null {
  if (step === 0) {
    if (!draft.name.trim() || !slug.safeParse(draft.slug).success || !draft.subtitle.trim() || !draft.materialUpper.trim() || !draft.materialSole.trim() || !/^\d{4,8}$/.test(draft.hsn)) return "Complete the name, slug, subtitle, materials and 4–8 digit HSN.";
    if (!draft.features.length) return "Choose at least one approved feature.";
  }
  if (step === 1 && (!draft.colorways.length || draft.colorways.some((c) => !c.name.trim() || !slug.safeParse(c.slug).success || !c.sizes.length || new Set(c.sizes).size !== c.sizes.length || new Set(draft.colorways.map((row) => row.slug)).size !== draft.colorways.length || c.sizes.some((size) => !SIZE_CHART[draft.gender].some((row) => row.uk === size))))) return "Add a named colourway and select a unique size run.";
  if (step === 2) {
    const offers = draft.colorways.flatMap((row) => row.offers);
    if (draft.colorways.some((row) => row.offers.length !== row.sizes.length || row.sizes.some((size) => !row.offers.some((offer) => offer.sizeUk === size)) || new Set(row.offers.map((offer) => offer.sizeUk)).size !== row.offers.length) ||
      offers.some((row) => !/^[A-Z0-9-]{3,60}$/.test(row.sku) || row.pricePaise <= 0 || row.mrpPaise < row.pricePaise) ||
      new Set(offers.map((row) => row.sku)).size !== offers.length) return "Every size needs a unique SKU, a price above zero, and an MRP at least as high.";
  }
  if (step === 3 && draft.colorways.some((row) => !row.images.some((image) => image.role === "primary" && image.alt.trim()) || row.images.some((image) => !image.alt.trim()))) return "Every colourway needs a primary image with alt text.";
  if (step === 4 && (!draft.description.trim() || !draft.care.trim() || !draft.keywords.some((word) => word.trim()))) return "Add a description, care instructions and at least one search keyword.";
  return null;
}

export function publishError(draft: ProductDraft): string | null {
  for (let step = 0; step < 5; step++) {
    const problem = stepError(draft, step);
    if (problem) return `${STEPS[step]}: ${problem}`;
  }
  return null;
}

export type QualityItem = { label: string; points: number; passed: boolean; step: number };
export function qualityScore(product: Pick<CatalogProduct, "colorways" | "description" | "features" | "keywords" | "gender">): { score: number; items: QualityItem[] } {
  const colors = product.colorways;
  const images = colors.flatMap((row) => row.images);
  const items: QualityItem[] = [
    { label: "At least 4 images per colourway", points: 30, passed: !!colors.length && colors.every((row) => row.images.length >= 4), step: 3 },
    { label: "Alt text on every image", points: 10, passed: !!images.length && images.every((row) => !!row.alt.trim()), step: 3 },
    { label: "Description of 300+ characters", points: 15, passed: product.description.trim().length >= 300, step: 4 },
    { label: "At least 3 approved features", points: 10, passed: product.features.length >= 3, step: 0 },
    { label: "Search keywords", points: 10, passed: !!product.keywords?.some((row) => row.trim()), step: 4 },
    { label: "Complete size run", points: 15, passed: !!colors.length && colors.every((row) => SIZE_CHART[product.gender].every((size) => row.variants.some((variant) => variant.sizeUk === size.uk))), step: 1 },
    { label: "Price set on each size", points: 10, passed: !!colors.length && colors.every((row) => !!row.variants.length && row.variants.every((variant) => variant.pricePaise > 0 && variant.pricePaise <= variant.mrpPaise)), step: 2 },
  ];
  return { score: items.reduce((sum, row) => sum + (row.passed ? row.points : 0), 0), items };
}

export function draftQuality(draft: ProductDraft): ReturnType<typeof qualityScore> {
  return qualityScore({
    colorways: draft.colorways.map((row) => ({
      id: row.id, name: row.name, slug: row.slug, swatch: row.swatch, family: row.family,
      images: row.images, spinFrames: 0,
      variants: row.offers.map((offer) => ({ id: offer.sku, sku: offer.sku, sizeUk: offer.sizeUk, sizeEu: 0, sizeUs: 0, footLengthMm: 0, label: String(offer.sizeUk), mrpPaise: offer.mrpPaise, pricePaise: offer.pricePaise, stock: offer.stock })),
    })),
    description: draft.description, features: draft.features, keywords: draft.keywords, gender: draft.gender,
  });
}
