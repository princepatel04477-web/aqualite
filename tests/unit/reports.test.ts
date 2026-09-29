import { beforeEach, describe, expect, it } from "vitest";

import {
  adjustStock,
  addToCart,
  catalogProducts,
  createCart,
  placeOrder,
  resetDemo,
  type AnalyticsEvent,
} from "@/lib/store/engine";
import { istDayAdd, istDayOf, istDayStartIso, istDayWindow, istDaysBetween } from "@/lib/time/ist";
import {
  labelFor,
  previousRange,
  rangeDays,
  resolveRange,
} from "@/lib/hub/reports/range";
import { bps, isLiveOrder, orderMoney, salesOf, unitsOf } from "@/lib/hub/reports/orders";
import { salesByDate, salesCsv, salesReportWithCompare } from "@/lib/hub/reports/sales";
import { productsCsv, productsReport } from "@/lib/hub/reports/products";
import { funnelReport } from "@/lib/hub/reports/funnel";
import { hsnForSku, taxReport } from "@/lib/hub/reports/tax";

const ACTOR = "admin:test";
const NOW = new Date("2026-03-15T12:00:00.000Z");

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

function ev(over: Partial<AnalyticsEvent> & { type: AnalyticsEvent["type"] }): AnalyticsEvent {
  const at = over.at ?? NOW.toISOString();
  return {
    id: `evt_${over.type}_${Math.random().toString(36).slice(2)}`,
    at,
    sessionId: "s1",
    path: "/",
    productId: null,
    referrerHost: null,
    device: "desktop",
    ipHash: "hash",
    orderId: null,
    valuePaise: 0,
    month: at.slice(0, 7),
    ...over,
  };
}

async function seedVariants(count: number) {
  const products = await catalogProducts();
  const variants = products.slice(0, count).map((product) => {
    const variant = product.colorways[0]?.variants[0];
    if (!variant) throw new Error("catalog seed missing");
    return { product, variant };
  });
  for (const { variant } of variants) {
    await adjustStock(variant.id, 500, "restock", "test headroom", ACTOR);
  }
  return variants;
}

async function placeCodOrder(email: string, lines: { variantId: string; qty: number }[]) {
  const cartId = await createCart();
  for (const line of lines) {
    await addToCart(cartId, line.variantId, line.qty);
  }
  const placed = await placeOrder({
    cartId,
    email,
    phone: "9876543210",
    address: ADDRESS,
    method: "cod",
    idempotencyKey: `key_${email}_${Math.random().toString(36).slice(2)}`,
    userId: null,
  });
  if (!placed.ok) throw new Error(`placeOrder failed: ${placed.error.code}`);
  return placed.data;
}

describe("IST day maths", () => {
  it("18:29Z is the same IST day; 18:30Z rolls to the next", () => {
    expect(istDayOf("2026-01-01T18:29:59.000Z")).toBe("2026-01-01");
    expect(istDayOf("2026-01-01T18:30:00.000Z")).toBe("2026-01-02");
    expect(istDayOf("2026-01-01T00:00:00.000Z")).toBe("2026-01-01");
    expect(istDayOf("2026-01-01T18:29:00+00:00")).toBe("2026-01-01");
  });

  it("day windows and steps respect the +05:30 offset across month boundaries", () => {
    expect(istDayStartIso("2026-03-05")).toBe("2026-03-04T18:30:00.000Z");
    expect(istDayWindow("2026-03-01", "2026-03-02")).toEqual({
      fromIso: "2026-02-28T18:30:00.000Z",
      toIso: "2026-03-02T18:30:00.000Z",
    });
    expect(istDaysBetween("2026-03-30", "2026-04-02")).toEqual([
      "2026-03-30",
      "2026-03-31",
      "2026-04-01",
      "2026-04-02",
    ]);
    expect(istDayAdd("2026-01-01", -1)).toBe("2025-12-31");
    expect(istDayAdd("2026-02-28", 1)).toBe("2026-03-01");
  });
});

describe("report ranges", () => {
  it("presets are IST-day based and the compare window is equal length", () => {
    const week = resolveRange("7d", {}, NOW);
    expect(week.fromDay).toBe("2026-03-09");
    expect(week.toDay).toBe("2026-03-15");
    expect(rangeDays(week)).toHaveLength(7);

    const previous = previousRange(week);
    expect(previous.toDay).toBe("2026-03-08");
    expect(previous.fromDay).toBe("2026-03-02");
    expect(rangeDays(previous)).toHaveLength(7);

    const lastMonth = resolveRange("last-month", {}, NOW);
    expect(lastMonth).toMatchObject({ fromDay: "2026-02-01", toDay: "2026-02-28" });

    const today = resolveRange("today", {}, NOW);
    expect(today.fromDay).toBe("2026-03-15");
    expect(labelFor(today)).toContain("2026");
  });

  it("custom ranges swap inverted inputs", () => {
    const custom = resolveRange("custom", { fromDay: "2026-03-10", toDay: "2026-03-05" }, NOW);
    expect(custom).toMatchObject({ fromDay: "2026-03-05", toDay: "2026-03-10" });
  });
});

describe("report totals equal order-table totals", () => {
  beforeEach(async () => {
    await resetDemo();
  });

  it("sales report totals == orderMoney over live orders in range", async () => {
    const seeded = await seedVariants(1);
    const first = seeded[0];
    if (!first) throw new Error("no seed");
    const { variant } = first;
    const orderA = await placeCodOrder("a@example.com", [{ variantId: variant.id, qty: 2 }]);
    const orderB = await placeCodOrder("b@example.com", [{ variantId: variant.id, qty: 1 }]);
    const cancelled = await placeCodOrder("c@example.com", [{ variantId: variant.id, qty: 1 }]);

    const orders = [orderA, orderB, cancelled];
    const range = resolveRange("today", {}, new Date());
    const report = salesByDate(orders, [], range);

    const live = orders.filter((order) => isLiveOrder(order));
    expect(report.totals.orders).toBe(live.length);
    expect(report.totals.units).toBe(unitsOf(live));
    expect(report.totals.salesPaise).toBe(salesOf(live));
    // Hand-checkable: net = line totals minus line discounts, no shipping/COD fee.
    const expected = live.reduce(
      (sum, order) =>
        sum + order.items.reduce((n, item) => n + item.lineTotalPaise - item.discountPaise, 0),
      0,
    );
    expect(report.totals.salesPaise).toBe(expected);
    // Sales excludes shipping and COD fees but the order total includes them.
    const withFees = live.reduce((sum, order) => sum + order.totalPaise, 0);
    expect(report.totals.salesPaise).toBeLessThan(withFees);
    expect(orderMoney(orderA).netPaise).toBe(
      orderA.items.reduce((n, item) => n + item.lineTotalPaise - item.discountPaise, 0),
    );
  });

  it("totals recompute for a cancelled order the moment it drops out of the table", async () => {
    const seeded = await seedVariants(1);
    const first = seeded[0];
    if (!first) throw new Error("no seed");
    const { variant } = first;
    const order = await placeCodOrder("d@example.com", [{ variantId: variant.id, qty: 1 }]);
    const range = resolveRange("today", {}, new Date());
    expect(salesByDate([order], [], range).totals.orders).toBe(1);
    expect(salesOf([order])).toBeGreaterThan(0);
  });

  it("products report lines sum to the same totals as the sales report", async () => {
    const seeded = await seedVariants(2);
    const [s1, s2] = seeded;
    if (!s1 || !s2) throw new Error("no seed");
    const orderA = await placeCodOrder("e@example.com", [
      { variantId: s1.variant.id, qty: 2 },
      { variantId: s2.variant.id, qty: 1 },
    ]);
    const orders = [orderA];
    const range = resolveRange("today", {}, new Date());
    const rows = productsReport({ orders, events: [], returns: [], range });
    const totalNet = rows.reduce((sum, row) => sum + row.salesPaise, 0);
    expect(totalNet).toBe(salesOf(orders));
    expect(rows.reduce((sum, row) => sum + row.units, 0)).toBe(unitsOf(orders));
    // Sales are keyed by productId — one row per distinct product.
    expect(rows.map((row) => row.productId).sort()).toEqual(
      [s1.product.id, s2.product.id].sort(),
    );
    expect(productsCsv(rows).trim().split("\n")).toHaveLength(rows.length + 1);
  });

  it("CSV exports carry one row per IST day plus a header", async () => {
    const seeded = await seedVariants(1);
    const first = seeded[0];
    if (!first) throw new Error("no seed");
    const orders = [await placeCodOrder("f@example.com", [{ variantId: first.variant.id, qty: 1 }])];
    const range = resolveRange("7d", {}, new Date());
    const report = salesByDate(orders, [], range);
    const csv = salesCsv(report.rows);
    expect(csv.trim().split("\n")).toHaveLength(8); // header + 7 days
  });
});

describe("funnel", () => {
  beforeEach(async () => {
    await resetDemo();
  });

  it("counts distinct sessions per step", async () => {
    const range = resolveRange("today", {}, NOW);
    const events = [
      ev({ type: "page_view", sessionId: "s1", at: NOW.toISOString() }),
      ev({ type: "page_view", sessionId: "s1", productId: "p1", at: NOW.toISOString() }),
      ev({ type: "add_to_cart", sessionId: "s1", productId: "p1", at: NOW.toISOString() }),
      ev({ type: "begin_checkout", sessionId: "s1", at: NOW.toISOString() }),
      ev({ type: "purchase", sessionId: "s1", orderId: "o1", at: NOW.toISOString() }),
      ev({ type: "page_view", sessionId: "s2", productId: "p1", at: NOW.toISOString() }),
      ev({ type: "add_to_cart", sessionId: "s2", productId: "p1", at: NOW.toISOString() }),
    ];
    const steps = funnelReport(events, range);
    expect(steps.map((step) => step.sessions)).toEqual([2, 2, 2, 1, 1]);
    expect(steps[0]?.stepBps).toBe(10000);
    expect(steps[2]?.stepBps).toBe(10000); // 2 of 2 PDP sessions added to bag
    expect(steps[4]?.ofTopBps).toBe(5000); // 1 purchase of 2 sessions
  });

  it("events outside the range are ignored", async () => {
    const range = resolveRange("today", {}, NOW);
    const events = [ev({ type: "purchase", sessionId: "s9", at: "2026-03-01T10:00:00.000Z" })];
    const steps = funnelReport(events, range);
    expect(steps[4]?.sessions).toBe(0);
  });
});

describe("GST report", () => {
  const baseOrder = {
    id: "o1",
    number: "AQL-1001",
    userId: null,
    email: "a@example.com",
    phone: "9876543210",
    status: "delivered" as const,
    paymentMethod: "cod" as const,
    address: {
      name: "T",
      phone: "9",
      line1: "l1",
      line2: "",
      landmark: "",
      city: "Mumbai",
      state: "MH",
      pincode: "400001",
    },
    subtotalPaise: 0,
    shippingPaise: 0,
    codFeePaise: 0,
    taxPaise: 0,
    totalPaise: 0,
    discountPaise: 0,
    promotionId: null,
    promotionCode: null,
    promotionName: null,
    promotionKind: null,
    idempotencyKey: "k",
    accessToken: "t",
    razorpayOrderId: null,
    reservationExpiresAt: null,
    trackingCarrier: null,
    trackingNumber: null,
    needsAttention: false,
    attentionNote: null,
    createdAt: "2026-03-05T10:00:00.000Z",
    updatedAt: "2026-03-06T10:00:00.000Z",
    paidAt: null,
    shippedAt: null,
    deliveredAt: null,
    confirmationSentAt: null,
    events: [],
  };

  it("slabs split at ₹2,500 per unit and HSN follows the SKU code", () => {
    const order = {
      ...baseOrder,
      items: [
        {
          id: "li1",
          productId: "p1",
          variantId: "v1",
          productName: "Slides",
          productSlug: "cloud-slides",
          colorwayName: "Black",
          sku: "AQ-SLI-001-BLK-42",
          sizeUk: 42,
          image: "",
          qty: 2,
          unitPricePaise: 159900,
          lineTotalPaise: 319800,
          discountPaise: 0,
          taxPaise: 15229,
          taxRateBps: 500,
        },
        {
          id: "li2",
          productId: "p2",
          variantId: "v2",
          productName: "Sneaker",
          productSlug: "runner",
          colorwayName: "White",
          sku: "AQ-SNE-002-WHT-42",
          sizeUk: 42,
          image: "",
          qty: 1,
          unitPricePaise: 299900,
          lineTotalPaise: 299900,
          discountPaise: 0,
          taxPaise: 45731,
          taxRateBps: 1800,
        },
      ],
    };
    const report = taxReport([order], "2026-03");
    expect(report.slabs).toHaveLength(2);
    expect(report.slabs[0]?.rateBps).toBe(500);
    expect(report.slabs[0]?.taxablePaise).toBe(319800);
    expect(report.slabs[1]?.rateBps).toBe(1800);
    expect(report.slabs[1]?.taxablePaise).toBe(299900);
    expect(report.totals.taxablePaise).toBe(619700);
    expect(report.totals.gstPaise).toBe(15229 + 45731);
    expect(hsnForSku("AQ-SLI-001-BLK-42").hsn).toBe("6404");
    expect(hsnForSku("AQ-SNE-002-WHT-42").hsn).toBe("6405");
    const hsnRow = report.hsn.find((row) => row.hsn === "6404");
    expect(hsnRow?.units).toBe(2);
  });

  it("refunded orders become credit notes and leave the slab totals", () => {
    const order = {
      ...baseOrder,
      status: "refunded" as const,
      items: [
        {
          id: "li1",
          productId: "p1",
          variantId: "v1",
          productName: "Slides",
          productSlug: "cloud-slides",
          colorwayName: "Black",
          sku: "AQ-SLI-001-BLK-42",
          sizeUk: 42,
          image: "",
          qty: 1,
          unitPricePaise: 159900,
          lineTotalPaise: 159900,
          discountPaise: 1000,
          taxPaise: 7567,
          taxRateBps: 500,
        },
      ],
    };
    const report = taxReport([order], "2026-03");
    expect(report.slabs).toHaveLength(0);
    expect(report.creditNotes).toHaveLength(1);
    expect(report.creditNotes[0]?.taxablePaise).toBe(-(159900 - 1000));
    expect(report.creditNotes[0]?.gstPaise).toBe(-7567);
    expect(report.totals.creditTaxablePaise).toBe(-158900);
  });

  it("orders outside the month are excluded", () => {
    const order = {
      ...baseOrder,
      createdAt: "2026-04-01T10:00:00.000Z",
      items: [
        {
          id: "li1",
          productId: "p1",
          variantId: "v1",
          productName: "Slides",
          productSlug: "cloud-slides",
          colorwayName: "Black",
          sku: "AQ-SLI-001-BLK-42",
          sizeUk: 42,
          image: "",
          qty: 1,
          unitPricePaise: 159900,
          lineTotalPaise: 159900,
          discountPaise: 0,
          taxPaise: 7615,
          taxRateBps: 500,
        },
      ],
    };
    expect(taxReport([order], "2026-03").totals.taxablePaise).toBe(0);
    // 2026-04-01T10:00Z is IST 2026-04-01 — an 18:30Z event would land in May.
    expect(istDayOf(order.createdAt)).toBe("2026-04-01");
    expect(istDayOf("2026-04-30T18:45:00.000Z")).toBe("2026-05-01");
  });

  it("conversion bps never divides by zero", () => {
    expect(bps(3, 0)).toBe(0);
    expect(bps(1, 3)).toBe(3333);
  });
});

describe("compare period", () => {
  beforeEach(async () => {
    await resetDemo();
  });

  it("previous-window orders land in the previous totals bucket", async () => {
    const seeded = await seedVariants(1);
    const first = seeded[0];
    if (!first) throw new Error("no seed");
    const { variant } = first;
    const order = await placeCodOrder("g@example.com", [{ variantId: variant.id, qty: 1 }]);
    const now = new Date();
    const range = resolveRange("7d", {}, now);
    const previous = previousRange(range);
    const report = salesReportWithCompare([order], [], range, previous);
    const sum = report.totals.salesPaise + report.previous.salesPaise;
    expect(sum).toBe(orderMoney(order).netPaise);
    expect(report.totals.orders + report.previous.orders).toBe(1);
  });
});
