import type { CatalogVariant } from "@/content/catalog";

/** Single server-authoritative clock predicate used by quotes, orders and display. */
export function effectivePrice(variant: Pick<CatalogVariant, "pricePaise" | "salePricePaise" | "saleStartsAt" | "saleEndsAt">, at: Date = new Date()): number {
  if (variant.salePricePaise == null || !variant.saleStartsAt || !variant.saleEndsAt) return variant.pricePaise;
  const start = Date.parse(variant.saleStartsAt);
  const end = Date.parse(variant.saleEndsAt);
  const time = at.getTime();
  return Number.isFinite(start) && Number.isFinite(end) && start <= time && time < end
    ? variant.salePricePaise : variant.pricePaise;
}

export type PriceChange = {
  id: string;
  variantId: string;
  sku: string;
  actor: string;
  at: string;
  before: { pricePaise: number; mrpPaise: number; salePricePaise: number | null; saleStartsAt: string | null; saleEndsAt: string | null; costPaise: number | null };
  after: { pricePaise: number; mrpPaise: number; salePricePaise: number | null; saleStartsAt: string | null; saleEndsAt: string | null; costPaise: number | null };
};

export type PricePatch = {
  variantId: string;
  pricePaise: number;
  mrpPaise?: number;
  salePricePaise?: number | null;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  costPaise?: number | null;
  expectedPricePaise?: number;
};

export function previewChange(pricePaise: number, mode: "percent" | "rupees" | "fixed", amount: number): number {
  return mode === "fixed" ? Math.round(amount * 100) : mode === "rupees"
    ? pricePaise + Math.round(amount * 100) : Math.round(pricePaise * (1 + amount / 100));
}
