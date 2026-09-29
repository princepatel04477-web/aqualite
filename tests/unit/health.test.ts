import { describe, expect, it } from "vitest";

import type { Order } from "@/lib/commerce/types";
import {
  accountHealth,
  metricDrillOrders,
  type HealthInput,
  type HealthMetricKey,
  type HealthReturnRow,
} from "@/lib/hub/reports/health";
import type { MessageRecord, MessageThread, StoredReview } from "@/lib/store/engine";

const NOW = new Date("2026-03-15T12:00:00.000Z");

function order(over: Partial<Order> & { id: string }): Order {
  return {
    number: `AQL-${over.id}`,
    userId: "u1",
    email: "buyer@example.com",
    phone: "9876543210",
    status: "delivered",
    paymentMethod: "cod",
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
    subtotalPaise: 159900,
    shippingPaise: 0,
    codFeePaise: 0,
    taxPaise: 7615,
    totalPaise: 167515,
    discountPaise: 0,
    promotionId: null,
    promotionCode: null,
    promotionName: null,
    promotionKind: null,
    idempotencyKey: `k-${over.id}`,
    accessToken: `t-${over.id}`,
    razorpayOrderId: null,
    reservationExpiresAt: null,
    trackingCarrier: null,
    trackingNumber: null,
    needsAttention: false,
    attentionNote: null,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
    paidAt: null,
    shippedAt: null,
    deliveredAt: null,
    confirmationSentAt: null,
    events: [],
    items: [
      {
        id: `li-${over.id}`,
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
    ...over,
  };
}

function review(over: Partial<StoredReview> & { id: string }): StoredReview {
  return {
    productId: "p1",
    userId: "u2",
    userName: "Buyer",
    rating: 2,
    title: "",
    body: "",
    fit: "true",
    status: "approved",
    verified: true,
    createdAt: "2026-03-01T10:00:00.000Z",
    ...over,
  };
}

/**
 * Hand-computed fixture (now = 2026-03-15T12:00Z, shipByDays = 2):
 *
 *  o1  created 02-20 qty2  shipped 02-22 (=ship-by, NOT late) tracking TRK1
 *  o2  created 02-25 qty1  shipped 03-01 (late)                tracking none
 *  o3  created 03-10 qty1  shipped 03-11 (on time)             tracking TRK3
 *  o4  created 03-12 qty1  cancelled by admin:seller (pre-ship)
 *  o5  created 03-13 qty1  cancelled by customer:sess1 (not PFC)
 *
 *  r1  return on o1 (different from photos, approved) 03-01
 *  rev1 ★2 by u2 on p1 03-01  → hits o2 (same buyer+product)
 *  rev2 ★5 by u1 on p1 03-01  → ignored
 *
 *  ODR   2/5 = 4000 bps     (defects o1, o2)
 *  LSR   1/3 = 3333 bps     (late o2; o1 at the exact boundary is not late)
 *  PFC   1/3 = 3333 bps     (only o4; window is 7d so o3 counts in denominator)
 *  VTR   2/3 = 6667 bps
 *  RTRN  2/4 = 5000 bps     (returned units = qty of li-o1 = 2; sold = 2+1+1)
 *  RESP  16 h               (in 03-14 00:00 → out 06:00 = 6h; in 10:00 open = 26h)
 */
function fixture(): HealthInput {
  const orders: Order[] = [
    order({
      id: "o1",
      userId: "u1",
      createdAt: "2026-02-20T12:00:00.000Z",
      shippedAt: "2026-02-22T12:00:00.000Z",
      trackingNumber: "TRK1",
      items: [
        {
          id: "li-o1",
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
      ],
    }),
    order({
      id: "o2",
      userId: "u2",
      createdAt: "2026-02-25T12:00:00.000Z",
      shippedAt: "2026-03-01T12:00:00.000Z",
      trackingNumber: null,
    }),
    order({
      id: "o3",
      userId: "u3",
      createdAt: "2026-03-10T00:00:00.000Z",
      shippedAt: "2026-03-11T00:00:00.000Z",
      trackingNumber: "TRK3",
    }),
    order({
      id: "o4",
      userId: "u4",
      status: "cancelled",
      createdAt: "2026-03-12T00:00:00.000Z",
      events: [
        { id: "e1", at: "2026-03-12T02:00:00.000Z", from: "paid", to: "cancelled", actor: "admin:seller", note: "out of stock" },
      ],
    }),
    order({
      id: "o5",
      userId: "u5",
      status: "cancelled",
      createdAt: "2026-03-13T00:00:00.000Z",
      events: [
        { id: "e2", at: "2026-03-13T02:00:00.000Z", from: "paid", to: "cancelled", actor: "customer:sess1", note: "changed mind" },
      ],
    }),
  ];
  const returns: HealthReturnRow[] = [
    {
      id: "ret1",
      orderId: "o1",
      orderItemId: "li-o1",
      reason: "Product different from photos",
      resolution: "replace",
      status: "approved",
      createdAt: "2026-03-01T10:00:00.000Z",
    },
  ];
  const reviews: StoredReview[] = [
    review({ id: "rev1", userId: "u2", rating: 2 }),
    review({ id: "rev2", userId: "u1", rating: 5 }),
  ];
  const threads: MessageThread[] = [
    {
      id: "thr1",
      orderId: null,
      customerEmail: "buyer@example.com",
      subject: "Where is my order?",
      status: "open",
      lastMessageAt: "2026-03-14T10:00:00.000Z",
      createdAt: "2026-03-14T00:00:00.000Z",
    },
  ];
  const messages: MessageRecord[] = [
    { id: "m1", threadId: "thr1", direction: "in", body: "Hello?", attachments: [], sentVia: "form", sentAt: "2026-03-14T00:00:00.000Z" },
    { id: "m2", threadId: "thr1", direction: "out", body: "On its way.", attachments: [], sentVia: "resend", sentAt: "2026-03-14T06:00:00.000Z" },
    { id: "m3", threadId: "thr1", direction: "in", body: "Still waiting?", attachments: [], sentVia: "webhook", sentAt: "2026-03-14T10:00:00.000Z" },
  ];
  return { orders, returns, reviews, threads, messages, shipByDays: 2, now: NOW };
}

function metricOf(input: HealthInput, key: HealthMetricKey) {
  const metric = accountHealth(input).find((row) => row.key === key);
  if (!metric) throw new Error(`missing metric ${key}`);
  return metric;
}

describe("account health — hand-computed seeds", () => {
  it("order defect rate 60d = 2/5 = 4000 bps", () => {
    const metric = metricOf(fixture(), "order_defect_rate");
    expect(metric.numerator).toBe(2);
    expect(metric.denominator).toBe(5);
    expect(metric.valueBps).toBe(4000);
    expect([...metric.orderIds].sort()).toEqual(["o1", "o2"]);
  });

  it("late shipment rate 30d = 1/3 = 3333 bps (exact ship-by is not late)", () => {
    const metric = metricOf(fixture(), "late_shipment_rate");
    expect(metric.numerator).toBe(1);
    expect(metric.denominator).toBe(3);
    expect(metric.valueBps).toBe(3333);
    expect(metric.orderIds).toEqual(["o2"]);
  });

  it("pre-fulfilment cancellations count only admin cancels = 1/3", () => {
    const metric = metricOf(fixture(), "pre_fulfilment_cancellation_rate");
    expect(metric.numerator).toBe(1);
    expect(metric.denominator).toBe(3);
    expect(metric.valueBps).toBe(3333);
    expect(metric.orderIds).toEqual(["o4"]);
  });

  it("valid tracking rate 30d = 2/3 = 6667 bps", () => {
    const metric = metricOf(fixture(), "valid_tracking_rate");
    expect(metric.numerator).toBe(2);
    expect(metric.denominator).toBe(3);
    expect(metric.valueBps).toBe(6667);
  });

  it("return rate 30d = returned units 2 / sold 4 = 5000 bps", () => {
    const metric = metricOf(fixture(), "return_rate");
    expect(metric.numerator).toBe(2);
    expect(metric.denominator).toBe(4);
    expect(metric.valueBps).toBe(5000);
  });

  it("message response median = 16 hours (6h answered + 26h open)", () => {
    const metric = metricOf(fixture(), "message_response_time");
    expect(metric.valueHours).toBe(16);
    expect(metric.denominator).toBe(2);
  });

  it("targets are the published ones and statuses derive from them", () => {
    const metrics = accountHealth(fixture());
    const odr = metrics.find((row) => row.key === "order_defect_rate");
    expect(odr?.targetBps).toBe(100); // < 1%
    expect(odr?.status).toBe("breach"); // 4000 bps over the watch band
    const response = metrics.find((row) => row.key === "message_response_time");
    expect(response?.targetHours).toBe(24);
    expect(response?.status).toBe("good"); // 16h median is under the 24h target
  });

  it("drill-down returns exactly the orders in the numerator", () => {
    const input = fixture();
    const metric = metricOf(input, "late_shipment_rate");
    const drilled = metricDrillOrders(metric, input.orders);
    expect(drilled.map((row) => row.id)).toEqual(["o2"]);
  });

  it("empty data yields zeroes, not NaN", () => {
    const metrics = accountHealth({
      orders: [],
      returns: [],
      reviews: [],
      threads: [],
      messages: [],
      shipByDays: 2,
      now: NOW,
    });
    for (const metric of metrics) {
      expect(metric.valueBps ?? 0).toBe(0);
      expect(Number.isNaN(metric.valueHours ?? 0)).toBe(false);
    }
  });
});
