import "server-only";

import {
  deriveDemoSettlements,
  feeFor,
  reconcile,
  type CapturedPayment,
  type SettlementDraft,
  type SettlementItemDraft,
} from "@/lib/hub/reports/settlements";
import { isDemoPayments, serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  listCapturedPayments,
  listOrders,
  listSettlementItems,
  listSettlements,
  notify,
  saveSettlements,
} from "@/lib/store/engine";

type ProviderSettlement = {
  id: string;
  utr: string | null;
  settledOn: string;
  grossPaise: number;
};

/** RazorpayX settlement pull — used only with real keys. */
async function fetchProviderSettlements(): Promise<ProviderSettlement[]> {
  const auth = Buffer.from(`${serverEnv.RAZORPAY_KEY_ID}:${serverEnv.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/settlements?count=100", {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!response.ok) throw new Error(`settlements fetch ${response.status}`);
  const body = (await response.json()) as {
    items?: { id: string; utr?: string; utrs?: string[]; amount: number; created_at: number }[];
  };
  return (body.items ?? []).map((item) => ({
    id: item.id,
    utr: item.utrs?.[0] ?? item.utr ?? item.id,
    settledOn: new Date(item.created_at * 1000).toISOString().slice(0, 10),
    grossPaise: item.amount,
  }));
}

/**
 * Daily sync: pull settlement rows (Razorpay API, or derived from the store's
 * captured payments in demo mode), persist them, reconcile every captured
 * payment and raise a hub notification for each mismatch.
 */
export async function syncSettlements(): Promise<{
  created: number;
  items: number;
  matched: number;
  mismatches: number;
}> {
  const payments: CapturedPayment[] = await listCapturedPayments();
  const orders = await listOrders();

  let settlements: SettlementDraft[];
  let items: SettlementItemDraft[];
  if (isDemoPayments()) {
    const derived = deriveDemoSettlements(payments);
    settlements = derived.settlements;
    items = derived.items;
  } else {
    const provider = await fetchProviderSettlements();
    const known = await listSettlementItems();
    settlements = provider.map((row) => {
      const subset = itemsForSettlement(known, row.id, payments);
      const gross = subset.reduce((sum, item) => sum + item.amountPaise, 0) || row.grossPaise;
      const cut = feeFor(gross);
      return {
        id: row.id,
        utr: row.utr ?? row.id,
        settledOn: row.settledOn,
        grossPaise: gross,
        feePaise: cut.feePaise,
        gstOnFeePaise: cut.gstOnFeePaise,
        netPaise: cut.netPaise,
        status: "processed",
        createdAt: new Date().toISOString(),
      };
    });
    items = provider.flatMap((row) => itemsForSettlement(known, row.id, payments));
  }

  const stored = await saveSettlements(settlements, items);
  // Reconcile what is actually stored — injected or stale rows must surface.
  const storedSettlements = await listSettlements();
  const storedItems = await listSettlementItems();
  const recon = reconcile(storedSettlements, storedItems, payments, orders);
  for (const mismatch of recon.mismatches) {
    await notify("settlement_mismatch", mismatch.title, mismatch.body, "/seller/reports/payments");
  }
  logger.info("settlements.synced", {
    created: stored.created,
    items: stored.items,
    matched: recon.matched.length,
    mismatches: recon.mismatches.length,
  });
  return {
    created: stored.created,
    items: stored.items,
    matched: recon.matched.length,
    mismatches: recon.mismatches.length,
  };
}

function itemsForSettlement(
  known: SettlementItemDraft[],
  settlementId: string,
  payments: CapturedPayment[],
): SettlementItemDraft[] {
  return known
    .filter((item) => item.settlementId === settlementId)
    .map((item) => {
      const payment = payments.find(
        (candidate) => (candidate.providerPaymentId ?? candidate.id) === item.paymentId,
      );
      return { ...item, orderId: item.orderId ?? payment?.orderId ?? null };
    });
}
