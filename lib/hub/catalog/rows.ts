import "server-only";

import type { CatalogProduct } from "@/content/catalog";
import type { Order } from "@/lib/commerce/types";
import { saleBuckets, stockPlanFromBuckets, type StockPlan } from "@/lib/hub/catalog/planning";
import { effectivePrice } from "@/lib/hub/pricing/effective";
import { hubSnapshot } from "@/lib/store/engine";

export type InventoryRow = {
  id: string; productId: string; productSlug: string; productName: string; colorway: string; image: string;
  sku: string; sizeUk: number; active: boolean; suppressed: string[];
  onHand: number; reserved: number; available: number;
  pricePaise: number; mrpPaise: number; effectivePaise: number;
  salePricePaise: number | null; saleStartsAt: string | null; saleEndsAt: string | null; costPaise: number | null;
  updatedAt: string; lastSoldAt: string | null; plan: StockPlan;
};

export function suppressionReasons(product: CatalogProduct, color: CatalogProduct["colorways"][number]): string[] {
  if (!product.isActive) return [];
  const problems: string[] = [];
  if (!color.images.some((image) => image.role === "primary" && image.src)) problems.push("Missing primary image");
  if (color.images.some((image) => !image.alt.trim())) problems.push("Missing image alt text");
  if (!color.variants.length) problems.push("No variants");
  if (color.variants.some((variant) => !variant.pricePaise)) problems.push("Missing price");
  return problems;
}

export function buildInventoryRows(products: CatalogProduct[], orders: Order[], stock: Record<string, { onHand: number; reserved: number }>, inactive: string[], now: Date, leadDays = 10, targetDays = 30): InventoryRow[] {
  const sales = saleBuckets(orders, now);
  return products.flatMap((product) => product.colorways.flatMap((color) => {
    const suppressed = suppressionReasons(product, color);
    return color.variants.map((variant) => {
      const onHand = stock[variant.id]?.onHand ?? variant.stock;
      const reserved = stock[variant.id]?.reserved ?? 0;
      const available = Math.max(0, onHand - reserved);
      return {
        id: variant.id, productId: product.id, productSlug: product.slug, productName: product.name,
        colorway: color.name, image: color.images.find((image) => image.role === "primary")?.src ?? color.images[0]?.src ?? "",
        sku: variant.sku, sizeUk: variant.sizeUk, active: product.isActive && !inactive.includes(variant.id), suppressed,
        onHand, reserved, available, pricePaise: variant.pricePaise, mrpPaise: variant.mrpPaise,
        effectivePaise: effectivePrice(variant, now), salePricePaise: variant.salePricePaise ?? null,
        saleStartsAt: variant.saleStartsAt ?? null, saleEndsAt: variant.saleEndsAt ?? null,
        costPaise: variant.costPaise ?? null, updatedAt: variant.updatedAt ?? product.publishedAt,
        lastSoldAt: sales.get(variant.id)?.lastSoldAt ?? null, plan: stockPlanFromBuckets(available, sales.get(variant.id), leadDays, targetDays),
      };
    });
  }));
}

export async function inventoryData() {
  const snapshot = await hubSnapshot();
  return {
    rows: buildInventoryRows(snapshot.products, snapshot.orders, snapshot.stock, snapshot.inactiveVariants, new Date(), snapshot.settings.leadTimeDays ?? 10, snapshot.settings.targetCoverDays ?? 30),
    leadDays: snapshot.settings.leadTimeDays ?? 10,
    targetDays: snapshot.settings.targetCoverDays ?? 30,
    ledger: snapshot.ledger,
    priceChanges: snapshot.priceChanges,
    products: snapshot.products,
  };
}
