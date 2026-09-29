import { beforeEach, describe, expect, it } from "vitest";

import {
  adjustStock,
  applyCouponToCart,
  catalogProducts,
  confirmPayment,
  couponAttemptLimited,
  createCart,
  createPromotion,
  addToCart,
  listRedemptions,
  placeOrder,
  resetDemo,
  transitionOrder,
} from "@/lib/store/engine";
import {
  allocateDiscount,
  quoteCartWithPromotions,
  taxFromNet,
  type PromoItem,
  type Promotion,
} from "@/lib/pricing/promotions";

const ACTOR = "admin:test";

function iso(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function promo(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: "promo_test",
    kind: "coupon",
    code: "TEST10",
    name: "Test 10",
    discountType: "percent",
    value: 1000,
    minSubtotalPaise: 0,
    maxDiscountPaise: null,
    appliesTo: "all",
    targetIds: [],
    startsAt: iso(-86_400_000),
    endsAt: null,
    usageLimitTotal: null,
    usageLimitPerCustomer: null,
    firstOrderOnly: false,
    stackable: false,
    isActive: true,
    createdAt: iso(-86_400_000),
    updatedAt: iso(-86_400_000),
    ...overrides,
  };
}

function item(overrides: Partial<PromoItem> = {}): PromoItem {
  return {
    lineId: "line-1",
    productId: "p-1",
    category: "slides",
    collectionSlugs: [],
    qty: 1,
    unitPricePaise: 100000,
    available: 5,
    ...overrides,
  };
}

const shipping = { thresholdPaise: 99900, feePaise: 7900, codFeePaise: 4900 };

function quoteCode(
  items: PromoItem[],
  code: string | null,
  promotions: Promotion[],
  extra: Partial<Parameters<typeof quoteCartWithPromotions>[0]> = {},
) {
  return quoteCartWithPromotions({ items, code, promotions, shipping, ...extra });
}

describe("quote_cart — allocation", () => {
  it("allocates flat discounts pro-rata with the remainder on the largest line", () => {
    const coupon = promo({ code: "TENOFF", value: 1000, discountType: "flat" });
    const quote = quoteCode(
      [
        item({ lineId: "a", unitPricePaise: 10000 }),
        item({ lineId: "b", unitPricePaise: 10000 }),
        item({ lineId: "c", unitPricePaise: 10000 }),
      ],
      "TENOFF",
      [coupon],
    );
    const byId = Object.fromEntries(quote.lines.map((line) => [line.lineId, line.discountPaise]));
    expect(byId["a"]).toBe(334); // remainder paise land on the largest line (ties → first)
    expect(byId["b"]).toBe(333);
    expect(byId["c"]).toBe(333);
    expect(quote.lineDiscountPaise).toBe(1000);
    expect(quote.totalPaise).toBe(30000 - 1000 + 7900);
  });

  it("keeps pro-rata shares proportional on uneven lines", () => {
    const coupon = promo({ code: "TEN", value: 1000 });
    const quote = quoteCode(
      [
        item({ lineId: "a", unitPricePaise: 10000 }),
        item({ lineId: "b", unitPricePaise: 5000 }),
        item({ lineId: "c", unitPricePaise: 3333 }),
      ],
      "TEN",
      [coupon],
    );
    const byId = Object.fromEntries(quote.lines.map((line) => [line.lineId, line.discountPaise]));
    // 10% of 18,333 = 1,833 → floors 999/499/333 + 2 remainder on the 10,000 line
    expect(byId["a"]).toBe(1001);
    expect(byId["b"]).toBe(499);
    expect(byId["c"]).toBe(333);
    expect(quote.lineDiscountPaise).toBe(1833);
  });

  it("applies a flat discount only to eligible lines", () => {
    const coupon = promo({
      code: "SLIDES",
      discountType: "flat",
      value: 5000,
      appliesTo: "categories",
      targetIds: ["slides"],
    });
    const quote = quoteCode(
      [
        item({ lineId: "a", category: "slides", unitPricePaise: 8000 }),
        item({ lineId: "b", category: "sneakers", unitPricePaise: 8000 }),
      ],
      "SLIDES",
      [coupon],
    );
    const byId = Object.fromEntries(quote.lines.map((line) => [line.lineId, line.discountPaise]));
    expect(byId["a"]).toBe(5000);
    expect(byId["b"]).toBe(0);
    expect(quote.lineDiscountPaise).toBe(5000);
  });

  it("allocateDiscount never over-allocates and always balances", () => {
    const target = promo({ appliesTo: "products", targetIds: ["p-1", "p-2"] });
    const items = [
      item({ lineId: "a", productId: "p-1", unitPricePaise: 7777 }),
      item({ lineId: "b", productId: "p-2", unitPricePaise: 3333 }),
      item({ lineId: "c", productId: "p-3", unitPricePaise: 9999 }),
    ];
    const shares = allocateDiscount(target, items, [7777, 3333, 9999], 1234);
    expect(shares[0]! + shares[1]! + shares[2]!).toBe(1234);
    expect(shares[2]).toBe(0);
  });
});

describe("quote_cart — GST on the discounted price", () => {
  it("drops to the 5% slab when the discount takes the unit under ₹2,500", () => {
    // ₹2,600 with 10% off → ₹2,340 net unit → 5% slab
    const coupon = promo({ code: "TEN", value: 1000 });
    const quote = quoteCode([item({ unitPricePaise: 260000 })], "TEN", [coupon]);
    const line = quote.lines[0]!;
    expect(line.discountPaise).toBe(26000);
    expect(line.discountedUnitPricePaise).toBe(234000);
    expect(line.taxRateBps).toBe(500);
    expect(line.taxPaise).toBe(taxFromNet(234000, 500));
    expect(quote.taxPaise).toBe(line.taxPaise);
  });

  it("stays at the 18% slab when the discount keeps the unit over ₹2,500", () => {
    // ₹2,800 with 5% off → ₹2,660 net unit → 18% slab
    const coupon = promo({ code: "FIVE", value: 500 });
    const quote = quoteCode([item({ unitPricePaise: 280000 })], "FIVE", [coupon]);
    const line = quote.lines[0]!;
    expect(line.discountPaise).toBe(14000);
    expect(line.discountedUnitPricePaise).toBe(266000);
    expect(line.taxRateBps).toBe(1800);
    expect(line.taxPaise).toBe(taxFromNet(266000, 1800));
  });

  it("crosses at exactly ₹2,500 net unit, both sides", () => {
    const coupon = promo({ code: "FLAT2", discountType: "flat", value: 2 });
    const atBoundary = quoteCode([item({ unitPricePaise: 250000 })], "FLAT2", [coupon]);
    expect(atBoundary.lines[0]!.discountedUnitPricePaise).toBe(249998);
    expect(atBoundary.lines[0]!.taxRateBps).toBe(500);

    const flat = promo({ code: "FLAT1", discountType: "flat", value: 1 });
    const over = quoteCode([item({ unitPricePaise: 250001 })], "FLAT1", [flat]);
    expect(over.lines[0]!.discountedUnitPricePaise).toBe(250000);
    expect(over.lines[0]!.taxRateBps).toBe(500);

    const none = promo({ code: "ZERO", discountType: "flat", value: 1, appliesTo: "products", targetIds: ["nope"] });
    const noDiscount = quoteCode([item({ unitPricePaise: 250001 })], "ZERO", [none]);
    expect(noDiscount.lines[0]!.taxRateBps).toBe(1800);
  });
});

describe("quote_cart — rejections", () => {
  const items = [item({ unitPricePaise: 50000, qty: 2 })];

  it("EXPIRED and NOT_STARTED", () => {
    expect(quoteCode(items, "OLD", [promo({ code: "OLD", endsAt: iso(-1000) })]).rejection?.code).toBe("EXPIRED");
    expect(quoteCode(items, "SOON", [promo({ code: "SOON", startsAt: iso(60_000) })]).rejection?.code).toBe("NOT_STARTED");
  });

  it("MIN_NOT_MET", () => {
    const quote = quoteCode(items, "BIG", [promo({ code: "BIG", minSubtotalPaise: 200000 })]);
    expect(quote.rejection?.code).toBe("MIN_NOT_MET");
  });

  it("USAGE_EXHAUSTED on the total limit", () => {
    const target = promo({ code: "HOT", usageLimitTotal: 10 });
    const quote = quoteCode(items, "HOT", [target], {
      usage: [{ promotionId: "promo_test", total: 10, forCustomer: 0 }],
    });
    expect(quote.rejection?.code).toBe("USAGE_EXHAUSTED");
  });

  it("ALREADY_USED on the per-customer limit and first-order-only", () => {
    const perCustomer = promo({ code: "ONCE", usageLimitPerCustomer: 1 });
    expect(
      quoteCode(items, "ONCE", [perCustomer], {
        usage: [{ promotionId: "promo_test", total: 1, forCustomer: 1 }],
        userId: null,
        email: "guest@example.com",
      }).rejection?.code,
    ).toBe("ALREADY_USED");

    const firstOrder = promo({ code: "FIRST", firstOrderOnly: true });
    expect(quoteCode(items, "FIRST", [firstOrder], { hasPriorOrders: true }).rejection?.code).toBe("ALREADY_USED");
  });

  it("NOT_ELIGIBLE for unknown codes and empty targeting hits", () => {
    expect(quoteCode(items, "NOPE", []).rejection?.code).toBe("NOT_ELIGIBLE");
    const scoped = promo({ code: "KIDS", appliesTo: "categories", targetIds: ["school-shoes"] });
    expect(quoteCode(items, "KIDS", [scoped]).rejection?.code).toBe("NOT_ELIGIBLE");
    expect(quoteCode([], "KIDS", [scoped]).rejection?.code).toBe("NOT_ELIGIBLE");
  });
});

describe("quote_cart — automatic selection and stacking", () => {
  it("applies the best automatic promotion", () => {
    const weak = promo({ id: "a1", kind: "automatic", code: null, name: "Weak", value: 500 });
    const strong = promo({ id: "a2", kind: "automatic", code: null, name: "Strong", value: 1500 });
    const quote = quoteCode([item({ unitPricePaise: 100000 })], null, [weak, strong]);
    expect(quote.autoPromo?.name).toBe("Strong");
    expect(quote.autoPromo?.discountPaise).toBe(15000);
    expect(quote.totalPaise).toBe(85000);
  });

  it("stacks coupon + automatic only when both are stackable", () => {
    const auto = promo({ id: "a1", kind: "automatic", code: null, name: "Monsoon offer", value: 1000, stackable: true });
    const coupon = promo({ id: "c1", code: "EXTRA", value: 500, stackable: true });
    const quote = quoteCode([item({ unitPricePaise: 100000 })], "EXTRA", [auto, coupon]);
    expect(quote.promo?.discountPaise).toBe(5000);
    expect(quote.autoPromo?.discountPaise).toBe(10000);
    expect(quote.lineDiscountPaise).toBe(15000);
    expect(quote.totalPaise).toBe(85000);
    expect(quote.rejection).toBeNull();
  });

  it("keeps only the larger discount when either side is non-stackable", () => {
    const auto = promo({ id: "a1", kind: "automatic", code: null, name: "Monsoon offer", value: 1500 });
    const coupon = promo({ id: "c1", code: "EXTRA", value: 500 });
    const autoWins = quoteCode([item({ unitPricePaise: 100000 })], "EXTRA", [auto, coupon]);
    expect(autoWins.promo).toBeNull();
    expect(autoWins.autoPromo?.discountPaise).toBe(15000);
    expect(autoWins.rejection?.code).toBe("NOT_ELIGIBLE");
    expect(autoWins.rejection?.displacedBy).toBe("Monsoon offer");

    const bigCoupon = promo({ id: "c2", code: "BIG", value: 2000 });
    const couponWins = quoteCode([item({ unitPricePaise: 100000 })], "BIG", [auto, bigCoupon]);
    expect(couponWins.promo?.discountPaise).toBe(20000);
    expect(couponWins.autoPromo).toBeNull();
    expect(couponWins.rejection).toBeNull();
  });

  it("turns shipping into the discount for free-shipping promotions", () => {
    const freeShip = promo({
      id: "fs",
      kind: "automatic",
      code: null,
      name: "Monsoon shipping",
      discountType: "free_shipping",
      value: 0,
    });
    const quote = quoteCode([item({ unitPricePaise: 49900 })], null, [freeShip]);
    expect(quote.shippingPaise).toBe(0);
    expect(quote.shippingSavedPaise).toBe(7900);
    expect(quote.discountTotalPaise).toBe(7900);
    expect(quote.totalPaise).toBe(49900);
    expect(quote.autoPromo?.freeShipping).toBe(true);
  });
});

/* ------------------------------------------------------------- engine (store) */

const ADDRESS = {
  name: "Test Buyer",
  phone: "9876543210",
  line1: "12 Marine Drive",
  line2: "",
  landmark: "",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400001",
};

async function seedVariant() {
  const products = await catalogProducts();
  const variant = products[0]?.colorways[0]?.variants[0];
  if (!variant) throw new Error("catalog seed missing");
  await adjustStock(variant.id, 500, "restock", "test headroom", ACTOR);
  return variant;
}

async function placeCodOrder(input: {
  cartId: string;
  email: string;
  userId?: string | null;
  idempotencyKey: string;
}) {
  return placeOrder({
    cartId: input.cartId,
    email: input.email,
    phone: "9876543210",
    address: ADDRESS,
    method: "cod",
    idempotencyKey: input.idempotencyKey,
    userId: input.userId ?? null,
  });
}

describe("promotions in the store engine", () => {
  beforeEach(async () => {
    await resetDemo();
  });

  it("30 parallel orders on a usage_limit_total 10 coupon redeem exactly 10 times", async () => {
    const variant = await seedVariant();
    const created = await createPromotion(
      {
        kind: "coupon",
        code: "RUSH10",
        name: "Rush 10",
        discountType: "flat",
        value: 10000,
        minSubtotalPaise: 0,
        maxDiscountPaise: null,
        appliesTo: "all",
        targetIds: [],
        startsAt: iso(-1000),
        endsAt: null,
        usageLimitTotal: 10,
        usageLimitPerCustomer: null,
        firstOrderOnly: false,
        stackable: false,
        isActive: true,
      },
      ACTOR,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    // 30 carts, coupon applied up front (0 redemptions at apply time).
    const cartIds: string[] = [];
    for (let index = 0; index < 30; index += 1) {
      const cartId = await createCart();
      await addToCart(cartId, variant.id, 1);
      const applied = await applyCouponToCart(cartId, "RUSH10");
      expect(applied.ok).toBe(true);
      cartIds.push(cartId);
    }

    // Concurrent placement — the serialized store chain is the transaction
    // that a FOR UPDATE promotion row would give us in Postgres.
    const results = await Promise.all(
      cartIds.map((cartId, index) =>
        placeOrder({
          cartId,
          email: `buyer${index}@example.com`,
          phone: "9876543210",
          address: ADDRESS,
          method: "cod",
          idempotencyKey: crypto.randomUUID(),
          userId: null,
        }),
      ),
    );

    const placed = results.filter((result) => result.ok);
    const rejected = results.filter((result) => !result.ok);
    expect(placed).toHaveLength(10);
    expect(rejected).toHaveLength(20);
    for (const result of rejected) {
      if (result.ok) continue;
      expect(result.error.code).toBe("PROMO_REJECTED");
      expect(result.error.details?.["promoReason"]).toBe("USAGE_EXHAUSTED");
    }
    const redemptions = await listRedemptions();
    expect(redemptions).toHaveLength(10);
    for (const row of redemptions) {
      expect(row.promotionId).toBe(created.data.id);
      expect(row.discountPaise).toBe(10000);
      expect(row.releasedAt).toBeNull();
    }
    // Snapshots land on the order and its lines.
    const first = placed[0];
    if (first && first.ok) {
      expect(first.data.discountPaise).toBe(10000);
      expect(first.data.promotionCode).toBe("RUSH10");
      expect(first.data.items[0]?.discountPaise).toBe(10000);
      expect(first.data.totalPaise).toBe(
        first.data.subtotalPaise - 10000 + first.data.shippingPaise + first.data.codFeePaise,
      );
    }
  });

  it("a cancelled order frees the usage slot", async () => {
    const variant = await seedVariant();
    await createPromotion(
      {
        kind: "coupon",
        code: "ONCE10",
        name: "Once",
        discountType: "flat",
        value: 1000,
        minSubtotalPaise: 0,
        maxDiscountPaise: null,
        appliesTo: "all",
        targetIds: [],
        startsAt: iso(-1000),
        endsAt: null,
        usageLimitTotal: 1,
        usageLimitPerCustomer: null,
        firstOrderOnly: false,
        stackable: false,
        isActive: true,
      },
      ACTOR,
    );
    const firstCart = await createCart();
    await addToCart(firstCart, variant.id, 1);
    await applyCouponToCart(firstCart, "ONCE10");
    const secondCart = await createCart();
    await addToCart(secondCart, variant.id, 1);
    await applyCouponToCart(secondCart, "ONCE10");

    const firstOrder = await placeOrder({
      cartId: firstCart,
      email: "one@example.com",
      phone: "9876543210",
      address: ADDRESS,
      method: "cod",
      idempotencyKey: crypto.randomUUID(),
      userId: null,
    });
    expect(firstOrder.ok).toBe(true);
    if (!firstOrder.ok) return;

    // While the first order is live the slot is taken — re-validated at place time.
    const blocked = await placeOrder({
      cartId: secondCart,
      email: "two@example.com",
      phone: "9876543210",
      address: ADDRESS,
      method: "cod",
      idempotencyKey: crypto.randomUUID(),
      userId: null,
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error.details?.["promoReason"]).toBe("USAGE_EXHAUSTED");

    const cancelled = await transitionOrder(firstOrder.data.id, "cancelled", "Customer cancelled", ACTOR);
    expect(cancelled.ok).toBe(true);

    const secondOrder = await placeOrder({
      cartId: secondCart,
      email: "two@example.com",
      phone: "9876543210",
      address: ADDRESS,
      method: "cod",
      idempotencyKey: crypto.randomUUID(),
      userId: null,
    });
    expect(secondOrder.ok).toBe(true);
    const rows = await listRedemptions();
    expect(rows.filter((row) => row.releasedAt === null)).toHaveLength(1);
    expect(rows.filter((row) => row.releasedAt !== null)).toHaveLength(1);
  });

  it("honours the per-customer limit for guest email and signed-in users", async () => {
    const variant = await seedVariant();
    await createPromotion(
      {
        kind: "coupon",
        code: "PER1",
        name: "One per customer",
        discountType: "flat",
        value: 500,
        minSubtotalPaise: 0,
        maxDiscountPaise: null,
        appliesTo: "all",
        targetIds: [],
        startsAt: iso(-1000),
        endsAt: null,
        usageLimitTotal: null,
        usageLimitPerCustomer: 1,
        firstOrderOnly: false,
        stackable: false,
        isActive: true,
      },
      ACTOR,
    );

    // Guest: keyed by lower(email). Both carts carry the code before any
    // redemption exists so the second failure proves transactional
    // re-validation at place time.
    const guestCartA = await createCart();
    await addToCart(guestCartA, variant.id, 1);
    await applyCouponToCart(guestCartA, "PER1", { userId: null, email: "guest@example.com" });
    const guestCartB = await createCart();
    await addToCart(guestCartB, variant.id, 1);
    await applyCouponToCart(guestCartB, "PER1", { userId: null, email: "guest@example.com" });

    const guestFirst = await placeCodOrder({
      cartId: guestCartA,
      email: "guest@example.com",
      idempotencyKey: crypto.randomUUID(),
    });
    expect(guestFirst.ok).toBe(true);
    const guestSecond = await placeOrder({
      cartId: guestCartB,
      email: "guest@example.com",
      phone: "9876543210",
      address: ADDRESS,
      method: "cod",
      idempotencyKey: crypto.randomUUID(),
      userId: null,
    });
    expect(guestSecond.ok).toBe(false);
    if (!guestSecond.ok) expect(guestSecond.error.details?.["promoReason"]).toBe("ALREADY_USED");

    // A different guest email is unaffected.
    const otherCart = await createCart();
    await addToCart(otherCart, variant.id, 1);
    await applyCouponToCart(otherCart, "PER1", { userId: null, email: "other@example.com" });
    const otherOrder = await placeOrder({
      cartId: otherCart,
      email: "other@example.com",
      phone: "9876543210",
      address: ADDRESS,
      method: "cod",
      idempotencyKey: crypto.randomUUID(),
      userId: null,
    });
    expect(otherOrder.ok).toBe(true);

    // Signed-in user: keyed by user id even across emails.
    const userCartA = await createCart();
    await addToCart(userCartA, variant.id, 1);
    await applyCouponToCart(userCartA, "PER1", { userId: "user-1", email: "u1@example.com" });
    const userCartB = await createCart();
    await addToCart(userCartB, variant.id, 1);
    await applyCouponToCart(userCartB, "PER1", { userId: "user-1", email: "u1+alt@example.com" });

    const userFirst = await placeOrder({
      cartId: userCartA,
      email: "u1@example.com",
      phone: "9876543210",
      address: ADDRESS,
      method: "cod",
      idempotencyKey: crypto.randomUUID(),
      userId: "user-1",
    });
    expect(userFirst.ok).toBe(true);
    const userSecond = await placeOrder({
      cartId: userCartB,
      email: "u1+alt@example.com",
      phone: "9876543210",
      address: ADDRESS,
      method: "cod",
      idempotencyKey: crypto.randomUUID(),
      userId: "user-1",
    });
    expect(userSecond.ok).toBe(false);
    if (!userSecond.ok) expect(userSecond.error.details?.["promoReason"]).toBe("ALREADY_USED");
  });

  it("keeps the server amount when a client total is tampered", async () => {
    const variant = await seedVariant();
    await createPromotion(
      {
        kind: "coupon",
        code: "TAMPER",
        name: "Ten percent",
        discountType: "percent",
        value: 1000,
        minSubtotalPaise: 0,
        maxDiscountPaise: null,
        appliesTo: "all",
        targetIds: [],
        startsAt: iso(-1000),
        endsAt: null,
        usageLimitTotal: null,
        usageLimitPerCustomer: null,
        firstOrderOnly: false,
        stackable: false,
        isActive: true,
      },
      ACTOR,
    );

    const cartId = await createCart();
    await addToCart(cartId, variant.id, 1);
    const quoted = await applyCouponToCart(cartId, "TAMPER");
    expect(quoted.ok).toBe(true);
    if (!quoted.ok) return;
    const serverTotal = quoted.data.totalPaise;

    const placed = await placeOrder({
      cartId,
      email: "tamper@example.com",
      phone: "9876543210",
      address: ADDRESS,
      method: "razorpay",
      idempotencyKey: crypto.randomUUID(),
      userId: null,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    // The amount handed to Razorpay is this server total — never the client's.
    expect(placed.data.totalPaise).toBe(serverTotal);

    const tampered = await confirmPayment(placed.data.id, "pay_tampered", serverTotal + 10000, "razorpay-verify");
    expect(tampered.ok).toBe(false);
    if (!tampered.ok) expect(tampered.error.code).toBe("AMOUNT_MISMATCH");

    const honest = await confirmPayment(placed.data.id, "pay_ok", serverTotal, "razorpay-verify");
    expect(honest.ok).toBe(true);
  });

  it("recomputes GST slabs on discounted order lines", async () => {
    const products = await catalogProducts();
    // Find (or fall back to) a high-MRP variant so the discount can cross the slab.
    const high = products
      .flatMap((product) => product.colorways.flatMap((colorway) => colorway.variants))
      .find((variant) => variant.pricePaise > 250000);
    const variant = high ?? (await seedVariant());
    await adjustStock(variant.id, 50, "restock", "test headroom", ACTOR);
    await createPromotion(
      {
        kind: "coupon",
        code: "CROSS",
        name: "Cross the slab",
        discountType: "percent",
        value: 2000,
        minSubtotalPaise: 0,
        maxDiscountPaise: null,
        appliesTo: "all",
        targetIds: [],
        startsAt: iso(-1000),
        endsAt: null,
        usageLimitTotal: null,
        usageLimitPerCustomer: null,
        firstOrderOnly: false,
        stackable: false,
        isActive: true,
      },
      ACTOR,
    );
    const cartId = await createCart();
    await addToCart(cartId, variant.id, 1);
    await applyCouponToCart(cartId, "CROSS");
    const placed = await placeOrder({
      cartId,
      email: "gst@example.com",
      phone: "9876543210",
      address: ADDRESS,
      method: "cod",
      idempotencyKey: crypto.randomUUID(),
      userId: null,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    const line = placed.data.items[0]!;
    const netUnit = Math.round((line.lineTotalPaise - line.discountPaise) / line.qty);
    expect(line.taxRateBps).toBe(netUnit <= 250000 ? 500 : 1800);
    expect(line.taxPaise).toBe(taxFromNet(line.lineTotalPaise - line.discountPaise, line.taxRateBps));
  });

  it("rate-limits coupon brute force to 10 attempts per 10 minutes per cart", async () => {
    const cartId = `cart-${crypto.randomUUID()}`;
    const attempts: boolean[] = [];
    for (let index = 0; index < 12; index += 1) {
      attempts.push(await couponAttemptLimited(cartId));
    }
    expect(attempts.slice(0, 10).every((limited) => limited === false)).toBe(true);
    expect(attempts.slice(10).every((limited) => limited === true)).toBe(true);

    // A different cart is unaffected.
    expect(await couponAttemptLimited(`cart-${crypto.randomUUID()}`)).toBe(false);
  });
});
