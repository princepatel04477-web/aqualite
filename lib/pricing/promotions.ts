/**
 * Promotion pricing core (S09).
 *
 * Pure and dependency-free — the server quote path (lib/store/engine) and the
 * Seller Hub live preview run exactly this code so previews can never drift
 * from checkout math. The SQL cutover keeps a quote_cart() mirror of these
 * semantics in supabase/migrations/0003_promotions.sql.
 *
 * Money is integer paise. Percent values are basis points (10% = 1000).
 * GST slabs always use the POST-discount unit price.
 */

export const PROMO_REJECTIONS = [
  "EXPIRED",
  "NOT_STARTED",
  "MIN_NOT_MET",
  "USAGE_EXHAUSTED",
  "NOT_ELIGIBLE",
  "ALREADY_USED",
] as const;

export type PromoRejectionReason = (typeof PROMO_REJECTIONS)[number];

export type PromoRejection = {
  code: PromoRejectionReason;
  /** Set when the coupon exists but a better automatic promotion displaced it. */
  displacedBy?: string;
};

export type PromotionKind = "coupon" | "automatic";
export type DiscountType = "percent" | "flat" | "free_shipping";
export type PromotionScope = "all" | "categories" | "products" | "collections";

export type Promotion = {
  id: string;
  kind: PromotionKind;
  /** Upper-case; null for automatic promotions. */
  code: string | null;
  name: string;
  discountType: DiscountType;
  /** percent → bps (10% = 1000); flat → paise; free_shipping → 0. */
  value: number;
  minSubtotalPaise: number;
  maxDiscountPaise: number | null;
  appliesTo: PromotionScope;
  /** Category slugs, product ids or collection slugs depending on appliesTo. */
  targetIds: string[];
  startsAt: string;
  endsAt: string | null;
  usageLimitTotal: number | null;
  usageLimitPerCustomer: number | null;
  firstOrderOnly: boolean;
  stackable: boolean;
  /** Seller pause switch. "End now" moves endsAt to now instead. */
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PromotionStatus = "scheduled" | "active" | "expired" | "paused";

export type PromoItem = {
  lineId: string;
  productId: string;
  category: string;
  collectionSlugs: string[];
  qty: number;
  unitPricePaise: number;
  available: number;
};

export type PromoUsage = {
  promotionId: string;
  /** Live redemptions (released ones excluded). */
  total: number;
  /** Live redemptions for this customer key. */
  forCustomer: number;
};

export type AppliedPromo = {
  promotionId: string;
  kind: PromotionKind;
  code: string | null;
  name: string;
  discountType: DiscountType;
  discountPaise: number;
  freeShipping: boolean;
};

export type PromoLine = PromoItem & {
  lineTotalPaise: number;
  discountPaise: number;
  discountedUnitPricePaise: number;
  taxRateBps: number;
  taxPaise: number;
  isShort: boolean;
};

export type PromoQuote = {
  lines: PromoLine[];
  subtotalPaise: number;
  /** Line discounts plus shipping saved by a free-shipping promotion. */
  discountTotalPaise: number;
  lineDiscountPaise: number;
  shippingSavedPaise: number;
  shippingPaise: number;
  codFeePaise: number;
  taxPaise: number;
  totalPaise: number;
  freeShippingRemainingPaise: number;
  promo: AppliedPromo | null;
  autoPromo: AppliedPromo | null;
  rejection: PromoRejection | null;
};

export type ShippingRules = {
  thresholdPaise: number;
  feePaise: number;
  codFeePaise: number;
};

export type QuoteCartInput = {
  items: PromoItem[];
  code?: string | null;
  email?: string | null;
  userId?: string | null;
  method?: "razorpay" | "cod";
  shipping: ShippingRules;
  promotions: Promotion[];
  usage?: PromoUsage[];
  /** True when the customer already has a placed (live) order. */
  hasPriorOrders?: boolean;
  now?: Date;
};

export const TAX_THRESHOLD_PAISE = 250000;
export const TAX_LOW_BPS = 500;
export const TAX_HIGH_BPS = 1800;

export function taxRateForUnit(unitPricePaise: number): number {
  return unitPricePaise <= TAX_THRESHOLD_PAISE ? TAX_LOW_BPS : TAX_HIGH_BPS;
}

/** Tax-inclusive extraction from a net line total at the given slab. */
export function taxFromNet(lineNetPaise: number, rateBps: number): number {
  return Math.round((lineNetPaise * rateBps) / (10000 + rateBps));
}

export function promotionStatus(promotion: Promotion, now: Date = new Date()): PromotionStatus {
  const t = now.getTime();
  if (promotion.endsAt && new Date(promotion.endsAt).getTime() <= t) return "expired";
  if (new Date(promotion.startsAt).getTime() > t) return "scheduled";
  if (!promotion.isActive) return "paused";
  return "active";
}

export function customerKeyOf(userId: string | null, email: string | null): string {
  return userId ?? (email ? email.trim().toLowerCase() : "");
}

function lineEligible(promotion: Promotion, item: PromoItem): boolean {
  switch (promotion.appliesTo) {
    case "all":
      return true;
    case "products":
      return promotion.targetIds.includes(item.productId);
    case "categories":
      return promotion.targetIds.includes(item.category);
    case "collections":
      return item.collectionSlugs.some((slug) => promotion.targetIds.includes(slug));
    default:
      return false;
  }
}

function eligibleSubtotal(promotion: Promotion, items: PromoItem[]): number {
  return items.reduce(
    (sum, item) => (lineEligible(promotion, item) ? sum + item.unitPricePaise * item.qty : sum),
    0,
  );
}

function usageFor(usage: PromoUsage[] | undefined, promotionId: string): PromoUsage {
  const found = usage?.find((item) => item.promotionId === promotionId);
  return found ?? { promotionId, total: 0, forCustomer: 0 };
}

function rawDiscount(promotion: Promotion, eligiblePaise: number): number {
  if (promotion.discountType === "percent") {
    return Math.round((eligiblePaise * promotion.value) / 10000);
  }
  if (promotion.discountType === "flat") {
    return Math.min(promotion.value, eligiblePaise);
  }
  return 0;
}

function cappedDiscount(promotion: Promotion, eligiblePaise: number): number {
  const raw = rawDiscount(promotion, eligiblePaise);
  return promotion.maxDiscountPaise === null
    ? raw
    : Math.min(raw, promotion.maxDiscountPaise);
}

export type Evaluation =
  | { ok: true; discountPaise: number; eligiblePaise: number; freeShipping: boolean }
  | { ok: false; rejection: PromoRejection };

/**
 * Single-promotion eligibility: window, pause, minimum subtotal, targeting,
 * usage limits and first-order-only. Discount is computed on `items` as if
 * this were the only promotion.
 */
export function evaluatePromotion(
  promotion: Promotion,
  context: {
    items: PromoItem[];
    subtotalPaise: number;
    usage?: PromoUsage[];
    customerKey?: string;
    hasPriorOrders?: boolean;
    now?: Date;
  },
): Evaluation {
  const now = context.now ?? new Date();
  const status = promotionStatus(promotion, now);
  if (status === "expired") return { ok: false, rejection: { code: "EXPIRED" } };
  if (status === "scheduled") return { ok: false, rejection: { code: "NOT_STARTED" } };
  if (status === "paused") return { ok: false, rejection: { code: "NOT_ELIGIBLE" } };
  if (context.subtotalPaise < promotion.minSubtotalPaise) {
    return { ok: false, rejection: { code: "MIN_NOT_MET" } };
  }
  const eligiblePaise = eligibleSubtotal(promotion, context.items);
  if (eligiblePaise <= 0) return { ok: false, rejection: { code: "NOT_ELIGIBLE" } };

  const used = usageFor(context.usage, promotion.id);
  if (promotion.usageLimitTotal !== null && used.total >= promotion.usageLimitTotal) {
    return { ok: false, rejection: { code: "USAGE_EXHAUSTED" } };
  }
  if (
    promotion.usageLimitPerCustomer !== null &&
    context.customerKey &&
    used.forCustomer >= promotion.usageLimitPerCustomer
  ) {
    return { ok: false, rejection: { code: "ALREADY_USED" } };
  }
  if (promotion.firstOrderOnly && context.hasPriorOrders) {
    return { ok: false, rejection: { code: "ALREADY_USED" } };
  }
  return {
    ok: true,
    discountPaise: cappedDiscount(promotion, eligiblePaise),
    eligiblePaise,
    freeShipping: promotion.discountType === "free_shipping",
  };
}

export type AllocatedPromotion = {
  promotion: Promotion;
  discountPaise: number;
};

/**
 * Pro-rata allocation of one discount across its eligible lines by remaining
 * line total; rounding remainder goes to the largest line (first on ties).
 */
export function allocateDiscount(
  promotion: Promotion,
  items: PromoItem[],
  remaining: number[],
  discountPaise: number,
): number[] {
  const shares = items.map(() => 0);
  if (discountPaise <= 0) return shares;
  const eligible = items
    .map((item, index) => ({ index, remaining: Math.max(0, remaining[index] ?? 0) }))
    .filter((entry) => entry.remaining > 0 && lineEligible(promotion, items[entry.index] as PromoItem));
  const pool = eligible.reduce((sum, entry) => sum + entry.remaining, 0);
  if (pool <= 0) return shares;

  let largestIndex = -1;
  let largestRemaining = -1;
  let allocated = 0;
  for (const entry of eligible) {
    const share = Math.floor((discountPaise * entry.remaining) / pool);
    shares[entry.index] = (shares[entry.index] ?? 0) + share;
    allocated += share;
    if (entry.remaining > largestRemaining) {
      largestRemaining = entry.remaining;
      largestIndex = entry.index;
    }
  }
  const remainder = discountPaise - allocated;
  if (remainder > 0 && largestIndex >= 0) {
    shares[largestIndex] = (shares[largestIndex] ?? 0) + remainder;
  }
  return shares;
}

type Candidate = {
  promotion: Promotion;
  discountPaise: number;
  freeShipping: boolean;
};

function bestAutomatic(
  promotions: Promotion[],
  input: QuoteCartInput,
  customerKey: string,
  now: Date,
): Candidate | null {
  let best: Candidate | null = null;
  for (const promotion of promotions) {
    if (promotion.kind !== "automatic") continue;
    const evaluation = evaluatePromotion(promotion, {
      items: input.items,
      subtotalPaise: input.items.reduce((sum, item) => sum + item.unitPricePaise * item.qty, 0),
      usage: input.usage,
      customerKey,
      hasPriorOrders: input.hasPriorOrders,
      now,
    });
    if (!evaluation.ok) continue;
    const candidate: Candidate = {
      promotion,
      discountPaise: evaluation.freeShipping ? 0 : evaluation.discountPaise,
      freeShipping: evaluation.freeShipping,
    };
    if (
      !best ||
      candidate.discountPaise > best.discountPaise ||
      (candidate.discountPaise === best.discountPaise && candidate.freeShipping && !best.freeShipping) ||
      (candidate.discountPaise === best.discountPaise &&
        candidate.freeShipping === best.freeShipping &&
        candidate.promotion.id.localeCompare(best.promotion.id) < 0)
    ) {
      best = candidate;
    }
  }
  return best;
}

/**
 * quote_cart(p_items, p_code, p_email, p_user) — the server-side cart quote.
 *
 * Best automatic promotion applies automatically; at most one coupon; a
 * coupon and an automatic promotion stack only when BOTH are stackable,
 * otherwise the larger discount wins (coupon wins ties). Rejections carry the
 * typed reason when a code was supplied and not applied.
 */
export function quoteCartWithPromotions(input: QuoteCartInput): PromoQuote {
  const now = input.now ?? new Date();
  const customerKey = customerKeyOf(input.userId ?? null, input.email ?? null);
  const items = input.items;
  const subtotalPaise = items.reduce((sum, item) => sum + item.unitPricePaise * item.qty, 0);

  const lines: PromoLine[] = items.map((item) => {
    const lineTotalPaise = item.unitPricePaise * item.qty;
    return {
      ...item,
      lineTotalPaise,
      discountPaise: 0,
      discountedUnitPricePaise: item.unitPricePaise,
      taxRateBps: taxRateForUnit(item.unitPricePaise),
      taxPaise: taxFromNet(lineTotalPaise, taxRateForUnit(item.unitPricePaise)),
      isShort: item.qty > item.available,
    };
  });

  const auto = bestAutomatic(input.promotions, input, customerKey, now);

  let coupon: Candidate | null = null;
  let rejection: PromoRejection | null = null;
  const rawCode = input.code?.trim().toUpperCase() ?? "";
  if (rawCode) {
    const promotion = input.promotions.find(
      (item) => item.kind === "coupon" && item.code === rawCode,
    );
    if (!promotion) {
      rejection = { code: "NOT_ELIGIBLE" };
    } else {
      const evaluation = evaluatePromotion(promotion, {
        items,
        subtotalPaise,
        usage: input.usage,
        customerKey,
        hasPriorOrders: input.hasPriorOrders,
        now,
      });
      if (evaluation.ok) {
        coupon = {
          promotion,
          discountPaise: evaluation.freeShipping ? 0 : evaluation.discountPaise,
          freeShipping: evaluation.freeShipping,
        };
      } else {
        rejection = evaluation.rejection;
      }
    }
  }

  // Non-stackable rule: both only when both say stackable; otherwise the
  // larger discount wins and the loser is reported as not applied.
  if (coupon && auto && !(coupon.promotion.stackable && auto.promotion.stackable)) {
    if (coupon.discountPaise >= auto.discountPaise) {
      // Coupon wins ties — keep it, drop the automatic silently.
      return finishQuote(input, lines, subtotalPaise, coupon, null, null);
    }
    rejection = { code: "NOT_ELIGIBLE", displacedBy: auto.promotion.name };
    coupon = null;
  }

  return finishQuote(input, lines, subtotalPaise, coupon, auto, rejection);
}

function finishQuote(
  input: QuoteCartInput,
  lines: PromoLine[],
  subtotalPaise: number,
  coupon: Candidate | null,
  auto: Candidate | null,
  rejection: PromoRejection | null,
): PromoQuote {
  const remaining = lines.map((line) => line.lineTotalPaise);
  const allocations: number[][] = [];
  for (const candidate of [coupon, auto]) {
    if (!candidate || candidate.discountPaise <= 0) {
      allocations.push(lines.map(() => 0));
      continue;
    }
    const shares = allocateDiscount(
      candidate.promotion,
      input.items,
      remaining,
      candidate.discountPaise,
    );
    allocations.push(shares);
    shares.forEach((share, index) => {
      remaining[index] = (remaining[index] ?? 0) - share;
    });
  }

  const lineDiscountPaise = lines.reduce(
    (sum, _line, index) =>
      sum + (allocations[0]?.[index] ?? 0) + (allocations[1]?.[index] ?? 0),
    0,
  );

  let shippingPaise = subtotalPaise <= 0
    ? 0
    : subtotalPaise >= input.shipping.thresholdPaise
      ? 0
      : input.shipping.feePaise;
  let shippingSavedPaise = 0;
  const freeShippingWinner = coupon?.freeShipping ? coupon : auto?.freeShipping ? auto : null;
  if (freeShippingWinner && shippingPaise > 0) {
    shippingSavedPaise = shippingPaise;
    shippingPaise = 0;
  }
  const codFeePaise = input.method === "cod" ? input.shipping.codFeePaise : 0;

  // GST recomputed on the discounted line price — slabs use the post-discount
  // unit price.
  let taxPaise = 0;
  for (const [index, line] of lines.entries()) {
    const discountPaise = (allocations[0]?.[index] ?? 0) + (allocations[1]?.[index] ?? 0);
    const net = line.lineTotalPaise - discountPaise;
    const unitNet = line.qty > 0 ? net / line.qty : 0;
    const rateBps = taxRateForUnit(Math.round(unitNet));
    line.discountPaise = discountPaise;
    line.discountedUnitPricePaise = line.qty > 0 ? Math.round(net / line.qty) : net;
    line.taxRateBps = rateBps;
    line.taxPaise = taxFromNet(net, rateBps);
    taxPaise += line.taxPaise;
  }

  const discountTotalPaise = lineDiscountPaise + shippingSavedPaise;
  const totalPaise = subtotalPaise - lineDiscountPaise + shippingPaise + codFeePaise;

  return {
    lines,
    subtotalPaise,
    discountTotalPaise,
    lineDiscountPaise,
    shippingSavedPaise,
    shippingPaise,
    codFeePaise,
    taxPaise,
    totalPaise,
    freeShippingRemainingPaise: Math.max(0, input.shipping.thresholdPaise - subtotalPaise),
    promo: coupon
      ? {
          promotionId: coupon.promotion.id,
          kind: "coupon",
          code: coupon.promotion.code,
          name: coupon.promotion.name,
          discountType: coupon.promotion.discountType,
          discountPaise: coupon.discountPaise + (coupon.freeShipping ? shippingSavedPaise : 0),
          freeShipping: coupon.freeShipping,
        }
      : null,
    autoPromo: auto
      ? {
          promotionId: auto.promotion.id,
          kind: "automatic",
          code: null,
          name: auto.promotion.name,
          discountType: auto.promotion.discountType,
          discountPaise:
            auto.discountPaise + (auto.freeShipping && !coupon?.freeShipping ? shippingSavedPaise : 0),
          freeShipping: auto.freeShipping,
        }
      : null,
    rejection,
  };
}

/**
 * Spec alias — quote_cart(p_items, p_code, p_email, p_user). The promotions /
 * usage context that a SQL call would read from tables is passed explicitly so
 * this module stays pure.
 */
export function quote_cart(
  p_items: PromoItem[],
  p_code: string | null,
  p_email: string | null,
  p_user: string | null,
  context: Omit<QuoteCartInput, "items" | "code" | "email" | "userId">,
): PromoQuote {
  return quoteCartWithPromotions({
    ...context,
    items: p_items,
    code: p_code,
    email: p_email,
    userId: p_user,
  });
}

/** Overlapping automatic promotions: same window + overlapping targeting. */
export function automaticConflicts(
  promotions: Promotion[],
  candidate: Pick<Promotion, "id" | "kind" | "appliesTo" | "targetIds" | "startsAt" | "endsAt">,
): Promotion[] {
  if (candidate.kind !== "automatic") return [];
  const starts = new Date(candidate.startsAt).getTime();
  const ends = candidate.endsAt ? new Date(candidate.endsAt).getTime() : Number.POSITIVE_INFINITY;
  return promotions.filter((other) => {
    if (other.kind !== "automatic" || other.id === candidate.id) return false;
    const otherStarts = new Date(other.startsAt).getTime();
    const otherEnds = other.endsAt ? new Date(other.endsAt).getTime() : Number.POSITIVE_INFINITY;
    if (otherStarts >= ends || otherEnds <= starts) return false;
    return targetingOverlaps(candidate.appliesTo, candidate.targetIds, other.appliesTo, other.targetIds);
  });
}

function targetingOverlaps(
  aScope: PromotionScope,
  aIds: string[],
  bScope: PromotionScope,
  bIds: string[],
): boolean {
  if (aScope === "all" || bScope === "all") return true;
  if (aScope === bScope) return aIds.some((id) => bIds.includes(id));
  return false;
}

/** Storefront badge copy — only when eligibility is product-local (no minimum). */
export function productPromoLabel(promotion: Promotion, now: Date = new Date()): string | null {
  if (promotion.kind !== "automatic") return null;
  if (promotionStatus(promotion, now) !== "active") return null;
  if (promotion.minSubtotalPaise > 0) return null;
  if (promotion.discountType === "free_shipping") return "Free shipping in bag";
  if (promotion.discountType === "percent") {
    return `Extra ${formatPercent(promotion.value)} off in bag`;
  }
  return `Extra ${formatPaiseShort(promotion.value)} off in bag`;
}

function formatPercent(bps: number): string {
  const value = bps / 100;
  return `${Number.isInteger(value) ? value : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
}

function formatPaiseShort(paise: number): string {
  return `₹${Math.round(paise / 100)}`;
}

/** Narrow a server-action error payload to its typed promotion reason. */
export function promoReasonFrom(details: Record<string, unknown> | undefined): PromoRejectionReason | null {
  const reason = details?.["promoReason"];
  return typeof reason === "string" && (PROMO_REJECTIONS as readonly string[]).includes(reason)
    ? (reason as PromoRejectionReason)
    : null;
}
