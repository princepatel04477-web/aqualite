"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin/guard";
import { draftSchema, type ProductDraft } from "@/lib/hub/catalog/schema";
import type { PricePatch } from "@/lib/hub/pricing/effective";
import { err, ok, type Result } from "@/lib/result";
import { addColorwayVariant, addStockBulk, adjustStock, publishProductDraft, saveProductDraft, setListingStatus, updateOffers, updateProductContent, updateProductImages, updateSettings } from "@/lib/store/engine";

const priceSchema = z.object({
  variantId: z.string().min(1), pricePaise: z.number().int().positive(), mrpPaise: z.number().int().positive().optional(),
  salePricePaise: z.number().int().positive().nullable().optional(),
  saleStartsAt: z.string().datetime({ offset: true }).nullable().optional(), saleEndsAt: z.string().datetime({ offset: true }).nullable().optional(),
  costPaise: z.number().int().nonnegative().nullable().optional(), expectedPricePaise: z.number().int().positive().optional(),
});

function bustCatalog(slugs?: string[]) {
  updateTag("catalog");
  revalidatePath("/seller/catalog/inventory");
  revalidatePath("/seller/pricing");
  revalidatePath("/shop");
  revalidatePath("/");
  for (const slug of slugs ?? []) revalidatePath(`/product/${slug}`);
}

async function safe<T>(operation: () => Promise<Result<T>>, revalidate = false, slugs?: string[]): Promise<Result<T>> {
  try {
    const result = await operation();
    if (result.ok && revalidate) bustCatalog(slugs);
    return result;
  } catch {
    return err("UNEXPECTED", "This change could not be saved. Please try again.");
  }
}

export async function savePricesAction(input: unknown): Promise<Result<{ updated: number }>> {
  const admin = await requireAdmin();
  const parsed = z.array(priceSchema).min(1).max(500).safeParse(input);
  if (!parsed.success) return err("VALIDATION", "Check the price, MRP and sale window.");
  return safe(() => updateOffers(parsed.data as PricePatch[], `admin:${admin.id}`), true);
}

export async function adjustInventoryAction(input: unknown): Promise<Result<{ available: number }>> {
  const admin = await requireAdmin();
  const parsed = z.object({ variantId: z.string().min(1), onHand: z.number().int().nonnegative(), currentOnHand: z.number().int().nonnegative(), reason: z.enum(["restock", "adjustment", "correction"]), note: z.string().min(2).max(200) }).safeParse(input);
  if (!parsed.success) return err("VALIDATION", "Enter a stock quantity, reason and note.");
  return safe(() => adjustStock(parsed.data.variantId, parsed.data.onHand - parsed.data.currentOnHand, parsed.data.reason, parsed.data.note, `admin:${admin.id}`, parsed.data.currentOnHand), true);
}

export async function bulkStockAction(input: unknown): Promise<Result<{ updated: number }>> {
  const admin = await requireAdmin();
  const parsed = z.array(z.object({ variantId: z.string().min(1), delta: z.number().int().positive() })).min(1).max(500).safeParse(input);
  if (!parsed.success) return err("VALIDATION", "Select valid stock additions.");
  return safe(() => addStockBulk(parsed.data, `admin:${admin.id}`), true);
}

export async function listingStatusAction(input: unknown): Promise<Result<{ updated: number }>> {
  const admin = await requireAdmin();
  const parsed = z.object({ ids: z.array(z.string().min(1)).min(1).max(500), active: z.boolean() }).safeParse(input);
  if (!parsed.success) return err("VALIDATION", "Select valid listings.");
  return safe(() => setListingStatus(parsed.data.ids, parsed.data.active, `admin:${admin.id}`), true);
}

export async function saveDraftAction(input: unknown): Promise<Result<{ id: string }>> {
  const admin = await requireAdmin();
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return err("VALIDATION", "Review the draft fields and try again.");
  return safe(() => saveProductDraft(parsed.data as ProductDraft, admin.id));
}

export async function publishDraftAction(input: unknown): Promise<Result<{ slug: string }>> {
  const admin = await requireAdmin();
  const id = z.string().uuid().safeParse(input);
  if (!id.success) return err("VALIDATION", "Invalid draft.");
  try {
    const result = await publishProductDraft(id.data, admin.id);
    if (result.ok) bustCatalog([result.data.slug]);
    return result;
  } catch { return err("UNEXPECTED", "Could not publish this listing. Please retry."); }
}

export async function savePlanningSettingsAction(input: unknown): Promise<Result<{ saved: boolean }>> {
  const admin = await requireAdmin();
  const parsed = z.object({ leadTimeDays: z.number().int().min(1).max(180), targetCoverDays: z.number().int().min(1).max(365) }).safeParse(input);
  if (!parsed.success) return err("VALIDATION", "Enter valid planning days.");
  try {
    await updateSettings(parsed.data, `admin:${admin.id}`);
    revalidatePath("/seller/inventory/planning");
    return ok({ saved: true });
  } catch { return err("UNEXPECTED", "Planning settings could not be saved."); }
}

export async function saveImagesAction(input: unknown): Promise<Result<{ saved: boolean }>> {
  const admin = await requireAdmin();
  const parsed = z.object({ colorwayId: z.string().min(1), images: z.array(z.object({
    src: z.string().min(1).max(500), alt: z.string().min(1).max(200), role: z.enum(["primary", "secondary", "detail", "sole", "on_foot"]),
    width: z.number().int().positive(), height: z.number().int().positive(),
  })).max(16) }).safeParse(input);
  if (!parsed.success) return err("VALIDATION", "Every image needs a role and alt text.");
  return safe(() => updateProductImages(parsed.data.colorwayId, parsed.data.images, `admin:${admin.id}`), true);
}

export async function saveContentAction(input: unknown): Promise<Result<{ saved: boolean }>> {
  const admin = await requireAdmin();
  const parsed = z.object({ productId: z.string().min(1), description: z.string().max(10000), care: z.string().max(2000),
    features: z.array(z.enum(["waterproof", "anti-skid", "lightweight", "quick-dry", "cushioned"])).max(5),
    keywords: z.array(z.string().max(50)).max(24), seoTitle: z.string().max(120), seoDescription: z.string().max(300),
  }).safeParse(input);
  if (!parsed.success) return err("VALIDATION", "Review the description, features and search terms.");
  const { productId, ...content } = parsed.data;
  return safe(() => updateProductContent(productId, content, `admin:${admin.id}`), true);
}

export async function addVariationAction(input: unknown): Promise<Result<{ id: string }>> {
  const admin = await requireAdmin();
  const parsed = z.object({ colorwayId: z.string().uuid(), sizeUk: z.number().positive(), sku: z.string().regex(/^[A-Z0-9-]{3,60}$/), pricePaise: z.number().int().positive(), mrpPaise: z.number().int().positive(), stock: z.number().int().nonnegative() }).safeParse(input);
  if (!parsed.success) return err("VALIDATION", "Enter a valid size, unique SKU and price.");
  return safe(() => addColorwayVariant(parsed.data, `admin:${admin.id}`), true);
}
