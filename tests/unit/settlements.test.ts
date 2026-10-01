import { beforeEach, describe, expect, it } from "vitest";

import {
  adjustStock,
  addToCart,
  catalogProducts,
  confirmPayment,
  createCart,
  listCapturedPayments,
  listNotifications,
  listSettlementItems,
  placeOrder,
  resetDemo,
  saveSettlements,
  type StoredSettlementItem,
} from "@/lib/store/engine";
import {
  deriveDemoSettlements,
  feeFor,
  reconcile,
  settlementCsv,
  codPeriods,
  type CapturedPayment,
  type SettlementItemDraft,
} from "@/lib/hub/reports/settlements";
import { syncSettlements } from "@/lib/payments/settlements";

const ACTOR = "admin:test";
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

async function placeAndCapture(providerPaymentId: string) {
  const variant = await seedVariant();
  const cartId = await createCart();
  await addToCart(cartId, variant.id, 1);
  const placed = await placeOrder({
    cartId,
    email: `buyer-${providerPaymentId}@example.com`,
    phone: "9876543210",
    address: ADDRESS,
    method: "razorpay",
    idempotencyKey: `key_${providerPaymentId}`,
    userId: null,
  });
  if (!placed.ok) throw new Error(`placeOrder failed: ${placed.error.code}`);
  const confirmed = await confirmPayment(
    placed.data.id,
    providerPaymentId,
    placed.data.totalPaise,
    "webhook:razorpay",
  );
  if (!confirmed.ok) throw new Error("confirmPayment failed");
  return placed.data;
}

describe("fee maths", () => {
  it("2% fee + 18% GST on the fee, all integer paise", () => {
    expect(feeFor(100000)).toEqual({ feePaise: 2000, gstOnFeePaise: 360, netPaise: 97640 });
    expect(feeFor(159900)).toEqual({ feePaise: 3198, gstOnFeePaise: 576, netPaise: 156126 });
    // Hand-check: 159900 * 2% = 3198; 3198 * 18% = 575.64 → 576; net = 156126.
    expect(feeFor(0)).toEqual({ feePaise: 0, gstOnFeePaise: 0, netPaise: 0 });
  });
});

describe("demo settlement derivation + reconciliation", () => {
  const paymentA: CapturedPayment = {
    id: "pay_a",
    orderId: "ord_a",
    providerPaymentId: "pay_A",
    amountPaise: 100000,
    status: "captured",
    at: "2026-03-01T10:00:00.000Z",
  };
  const paymentB: CapturedPayment = {
    id: "pay_b",
    orderId: "ord_b",
    providerPaymentId: "pay_B",
    amountPaise: 200000,
    status: "captured",
    at: "2026-03-01T12:00:00.000Z",
  };
  const orders = [
    { id: "ord_a", number: "AQL-1", totalPaise: 100000 },
    { id: "ord_b", number: "AQL-2", totalPaise: 200000 },
  ] as never;

  it("payments on the same day settle together T+1 with a shared UTR", () => {
    const { settlements, items } = deriveDemoSettlements([paymentA, paymentB]);
    expect(settlements).toHaveLength(1);
    expect(settlements[0]?.settledOn).toBe("2026-03-02");
    expect(settlements[0]?.utr).toBe("UTR20260302002");
    expect(settlements[0]?.grossPaise).toBe(300000);
    expect(items).toHaveLength(2);
    const feeSum = items.reduce((sum, item) => sum + item.feePaise, 0);
    const netSum = items.reduce((sum, item) => sum + item.netPaise, 0);
    expect(settlements[0]?.feePaise).toBe(feeSum);
    expect(settlements[0]?.netPaise).toBe(netSum);
  });

  it("seeded settlements reconcile clean: every payment matched", () => {
    const { settlements, items } = deriveDemoSettlements([paymentA, paymentB]);
    const recon = reconcile(settlements, items, [paymentA, paymentB], orders);
    expect(recon.matched).toHaveLength(2);
    expect(recon.unsettled).toHaveLength(0);
    expect(recon.orphans).toHaveLength(0);
    expect(recon.mismatches).toHaveLength(0);
  });

  it("an injected amount mismatch is caught", () => {
    const { settlements, items } = deriveDemoSettlements([paymentA, paymentB]);
    const tampered: SettlementItemDraft[] = items.map((item) =>
      item.paymentId === "pay_A" ? { ...item, amountPaise: item.amountPaise + 100 } : item,
    );
    const recon = reconcile(settlements, tampered, [paymentA, paymentB], orders);
    expect(recon.matched).toHaveLength(1);
    expect(recon.mismatches).toHaveLength(1);
    expect(recon.mismatches[0]?.title).toContain("does not match");
  });

  it("a missing settlement item shows up as unsettled", () => {
    const { settlements, items } = deriveDemoSettlements([paymentA, paymentB]);
    const partial = items.filter((item) => item.paymentId === "pay_A");
    const recon = reconcile(settlements, partial, [paymentA, paymentB], orders);
    expect(recon.unsettled.map((payment) => payment.id)).toEqual(["pay_b"]);
    expect(recon.mismatches).toHaveLength(1);
    expect(recon.mismatches[0]?.title).toContain("not settled");
  });

  it("settlement CSV has one row per item", () => {
    const { settlements, items } = deriveDemoSettlements([paymentA, paymentB]);
    const csv = settlementCsv(settlements, items, orders);
    expect(csv.trim().split("\n")).toHaveLength(3);
    expect(csv.split("\n")[0]).toContain("utr");
  });

  it("COD periods bucket uncollected totals", () => {
    const periods = codPeriods(
      [
        {
          id: "o1",
          createdAt: "2026-03-05T10:00:00.000Z",
          paymentMethod: "cod",
          status: "delivered",
          totalPaise: 5000,
          codFeePaise: 4900,
        },
        {
          id: "o2",
          createdAt: "2026-03-20T10:00:00.000Z",
          paymentMethod: "cod",
          status: "shipped",
          totalPaise: 7000,
          codFeePaise: 4900,
        },
      ] as never,
      [],
    );
    expect(periods).toHaveLength(2);
    expect(periods[0]?.periodStart).toBe("2026-03-20"); // newest IST day first
    expect(periods[0]?.amountPaise).toBe(7000);
    expect(periods[0]?.status).toBe("to_collect");
    expect(periods[1]?.periodStart).toBe("2026-03-05");
    expect(periods[1]?.amountPaise).toBe(5000);
  });
});

describe("syncSettlements — seeded store + injected mismatch", () => {
  beforeEach(async () => {
    await resetDemo();
  });

  it("derives from captured payments and reconciles clean the first time", async () => {
    await placeAndCapture("pay_A");
    await placeAndCapture("pay_B");
    const result = await syncSettlements();
    expect(result.created).toBe(1); // same IST day → one T+1 settlement
    expect(result.items).toBe(2);
    expect(result.matched).toBe(2);
    expect(result.mismatches).toBe(0);
    expect(await listNotifications()).toHaveLength(0);
    const stored = await listSettlementItems();
    expect(stored).toHaveLength(2);
  });

  it("an injected mismatch raises a settlement_mismatch hub notification", async () => {
    await placeAndCapture("pay_A");
    const payments = await listCapturedPayments();
    const derived = deriveDemoSettlements(payments);
    const good = derived.items[0] as StoredSettlementItem;
    // Inject a wrong row under the same identity BEFORE the first sync — the
    // sync must detect the stored amount does not match the captured payment.
    await saveSettlements([], [
      {
        id: "sti_corrupt",
        settlementId: good.settlementId,
        paymentId: good.paymentId,
        orderId: good.orderId,
        amountPaise: good.amountPaise + 100,
        feePaise: good.feePaise,
        gstOnFeePaise: good.gstOnFeePaise,
        netPaise: good.netPaise,
      },
    ]);
    const result = await syncSettlements();
    expect(result.mismatches).toBeGreaterThanOrEqual(1);
    const notifications = await listNotifications();
    const mismatch = notifications.find((row) => row.kind === "settlement_mismatch");
    expect(mismatch).toBeTruthy();
    expect(mismatch?.title).toContain("does not match");
  });

  it("payments land in listCapturedPayments with provider ids", async () => {
    await placeAndCapture("pay_Z");
    const payments = await listCapturedPayments();
    expect(payments.some((row) => row.providerPaymentId === "pay_Z")).toBe(true);
  });
});
