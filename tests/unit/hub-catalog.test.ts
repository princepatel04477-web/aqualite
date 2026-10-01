import { beforeEach, describe, expect, it, vi } from "vitest";

import { products } from "@/content/catalog";
import { getProduct } from "@/lib/catalog/queries";
import { stockPlan } from "@/lib/hub/catalog/planning";
import { draftQuality, newDraft, publishError, stepError } from "@/lib/hub/catalog/schema";
import { qualityScore } from "@/lib/hub/catalog/schema";
import { effectivePrice, previewChange } from "@/lib/hub/pricing/effective";
import { addToCart, catalogProducts, createCart, placeOrder, quoteFor, readProductDrafts, resetDemo, saveProductDraft, publishProductDraft, updateProductContent, updateProductImages, updateOffers } from "@/lib/store/engine";
import type { Order } from "@/lib/commerce/types";

const variant = products[0]?.colorways[0]?.variants[0];

describe("scheduled prices", () => {
  it("uses half-open time windows and exact paise, including a two-minute sale", () => {
    const offer = { pricePaise: 49900, salePricePaise: 39900, saleStartsAt: "2026-10-01T12:00:00Z", saleEndsAt: "2026-10-01T12:02:00Z" };
    expect(effectivePrice(offer, new Date("2026-10-01T11:59:59.999Z"))).toBe(49900);
    expect(effectivePrice(offer, new Date("2026-10-01T12:00:00Z"))).toBe(39900);
    expect(effectivePrice(offer, new Date("2026-10-01T12:01:59.999Z"))).toBe(39900);
    expect(effectivePrice(offer, new Date("2026-10-01T12:02:00Z"))).toBe(49900);
    expect(previewChange(49900, "percent", 10)).toBe(54890);
    expect(previewChange(49900, "rupees", 10)).toBe(50900);
  });
  beforeEach(async () => { await resetDemo(); });
  it("uses the changed price in quotes and reserves the sale price on a real order", async () => {
    if (!variant) throw new Error("Seed variant required");
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-01T11:59:00Z"));
      const cartId = await createCart();
      const added = await addToCart(cartId, variant.id, 1);
      expect(added.ok).toBe(true);
      const original = await quoteFor(cartId, "cod");
      expect(original.ok && original.data.lines[0]?.unitPricePaise).toBe(variant.pricePaise);
      const saved = await updateOffers([{ variantId: variant.id, pricePaise: variant.pricePaise - 100, expectedPricePaise: variant.pricePaise,
        salePricePaise: variant.pricePaise - 5000, saleStartsAt: "2026-10-01T12:00:00Z", saleEndsAt: "2026-10-01T12:02:00Z" }], "test");
      expect(saved.ok).toBe(true);
      expect((await catalogProducts())[0]?.colorways[0]?.variants[0]?.pricePaise).toBe(variant.pricePaise - 100);
      expect((await getProduct(products[0]?.slug ?? ""))?.product.colorways[0]?.variants[0]?.pricePaise).toBe(variant.pricePaise - 100);
      const regular = await quoteFor(cartId, "cod");
      expect(regular.ok && regular.data.lines[0]?.unitPricePaise).toBe(variant.pricePaise - 100);
      vi.setSystemTime(new Date("2026-10-01T12:01:00Z"));
      const sale = await quoteFor(cartId, "cod");
      expect(sale.ok && sale.data.lines[0]?.unitPricePaise).toBe(variant.pricePaise - 5000);
      const order = await placeOrder({ cartId, method: "cod", email: "buyer@example.com", phone: "9876543210", idempotencyKey: crypto.randomUUID(), userId: null,
        address: { name: "Buyer", phone: "9876543210", line1: "12 Test Lane", line2: "", landmark: "", city: "Surat", state: "Gujarat", pincode: "395003" } });
      expect(order.ok && order.data.items[0]?.unitPricePaise).toBe(variant.pricePaise - 5000);
      vi.setSystemTime(new Date("2026-10-01T12:02:00Z"));
      const nextCart = await createCart(); await addToCart(nextCart, variant.id, 1);
      const after = await quoteFor(nextCart, "cod");
      expect(after.ok && after.data.lines[0]?.unitPricePaise).toBe(variant.pricePaise - 100);
      const later = await placeOrder({ cartId: nextCart, method: "cod", email: "second@example.com", phone: "9876543210", idempotencyKey: crypto.randomUUID(), userId: null,
        address: { name: "Buyer", phone: "9876543210", line1: "12 Test Lane", line2: "", landmark: "", city: "Surat", state: "Gujarat", pincode: "395003" } });
      expect(later.ok && later.data.items[0]?.unitPricePaise).toBe(variant.pricePaise - 100);
    } finally { vi.useRealTimers(); }
  });
  it("applies the exact +10% preview and rejects stale bulk edits atomically", async () => {
    await resetDemo();
    const a = products[0]?.colorways[0]?.variants[0];
    const b = products[0]?.colorways[0]?.variants[1];
    if (!a || !b) throw new Error("Seed variants required");
    const patches = [a, b].map((row) => ({ variantId: row.id, pricePaise: previewChange(row.pricePaise, "percent", 10), expectedPricePaise: row.pricePaise }));
    const applied = await updateOffers(patches, "seller:test");
    expect(applied.ok).toBe(true);
    const productsNow = await catalogProducts();
    const variants = productsNow[0]?.colorways[0]?.variants;
    expect(variants?.[0]?.pricePaise).toBe(patches[0]?.pricePaise);
    expect(variants?.[1]?.pricePaise).toBe(patches[1]?.pricePaise);
    const stale = await updateOffers(patches, "seller:test");
    expect(stale.ok).toBe(false);
    expect((await catalogProducts())[0]?.colorways[0]?.variants[0]?.pricePaise).toBe(patches[0]?.pricePaise);
    const invalidSale = await updateOffers([{ variantId: a.id, pricePaise: patches[0]!.pricePaise, salePricePaise: patches[0]!.pricePaise + 1,
      saleStartsAt: "2026-10-01T12:00:00Z", saleEndsAt: "2026-10-01T12:02:00Z" }], "seller:test");
    expect(invalidSale.ok).toBe(false);
  });
});

describe("restock and product drafts", () => {
  it("matches hand-calculated reorder and cover", () => {
    const now = new Date("2026-09-29T12:00:00Z");
    const orders = [{ status: "paid", paidAt: "2026-09-20T12:00:00Z", createdAt: "2026-09-20T12:00:00Z", items: [{ variantId: "v", qty: 30 }] },
      { status: "cancelled", paidAt: null, createdAt: "2026-09-20T12:00:00Z", items: [{ variantId: "v", qty: 100 }] }] as Order[];
    const plan = stockPlan("v", 15, orders, now, 10, 30);
    expect(plan).toMatchObject({ sold7: 0, sold30: 30, sold90: 30, velocity: 1, daysCover: 15, reorderQty: 25, status: "Restock soon" });
  });
  it("autosaved drafts resume by owner and cannot publish without required steps", async () => {
    await resetDemo();
    const draft = { ...newDraft(), step: 2 };
    const saved = await saveProductDraft(draft, "seller-1");
    expect(saved.ok).toBe(true);
    expect((await readProductDrafts("seller-1"))[0]?.draft.step).toBe(2);
    expect(await readProductDrafts("seller-2")).toHaveLength(0);
    expect(publishError(draft)).not.toBeNull();
    expect(stepError(draft, 0)).not.toBeNull();
    expect(draftQuality(draft).score).toBe(0);
  });
  it("publishes a complete saved draft exactly once with atomic initial stock", async () => {
    await resetDemo();
    const draft = newDraft();
    draft.name = "Test Floaters"; draft.slug = "test-floaters"; draft.subtitle = "A new pair";
    draft.materialUpper = "Rubber"; draft.materialSole = "Rubber"; draft.features = ["waterproof"]; draft.hsn = "6402";
    draft.colorways = [{ id: crypto.randomUUID(), name: "Red", slug: "red", swatch: "red", family: "red", sizes: [6],
      offers: [{ sizeUk: 6, sku: "TEST-RED-6", mrpPaise: 100000, pricePaise: 80000, stock: 12 }],
      images: [{ src: `/api/media/catalog-${crypto.randomUUID()}.webp`, alt: "Red pair", role: "primary", width: 800, height: 800 }],
    }];
    draft.description = "A durable and light pair."; draft.care = "Rinse and dry."; draft.keywords = ["red slides"];
    expect(publishError(draft)).toBeNull();
    expect((await saveProductDraft(draft, "seller-1")).ok).toBe(true);
    const published = await publishProductDraft(draft.id, "seller-1");
    expect(published.ok).toBe(true);
    expect((await catalogProducts()).find((row) => row.slug === draft.slug)?.isActive).toBe(true);
    expect((await publishProductDraft(draft.id, "seller-1")).ok).toBe(false);
  });
  it("recalculates listing quality when the description changes", async () => {
    await resetDemo();
    const original = (await catalogProducts())[0]; if (!original) throw new Error("Seed product required");
    const before = qualityScore(original).score;
    const updated = await updateProductContent(original.id, { description: "x".repeat(300), care: original.care,
      features: original.features, keywords: original.keywords ?? [], seoTitle: "", seoDescription: "" }, "seller:test");
    expect(updated.ok).toBe(true);
    const after = (await catalogProducts()).find((row) => row.id === original.id);
    expect(after && qualityScore(after).score).toBeGreaterThanOrEqual(before);
  });
  it("suppressed colourways cannot be added to the bag or quoted", async () => {
    await resetDemo();
    const color = products[0]?.colorways[0]; const variant = color?.variants[0];
    if (!color || !variant) throw new Error("Seed colorway required");
    const cartId = await createCart();
    expect((await addToCart(cartId, variant.id, 1)).ok).toBe(true);
    expect((await updateProductImages(color.id, [], "seller:test")).ok).toBe(true);
    expect((await quoteFor(cartId, "cod")).ok).toBe(false);
    expect((await addToCart(cartId, variant.id, 1)).ok).toBe(false);
  });
});
