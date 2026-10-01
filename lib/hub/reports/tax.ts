/**
 * Monthly GST report: taxable value and GST by rate slab, HSN summary and
 * credit notes from refunds. Rates follow the store's slabs (5% ≤ ₹2,500
 * unit, 18% above) — provisional until the CA confirms (see the banner).
 */

import type { Order } from "@/lib/commerce/types";
import { isLiveOrder, itemNet } from "@/lib/hub/reports/orders";
import { istDayOf } from "@/lib/time/ist";

export type TaxSlabRow = {
  slabLabel: string;
  rateBps: number;
  taxablePaise: number;
  gstPaise: number;
  units: number;
};

export type HsnRow = {
  hsn: string;
  description: string;
  units: number;
  taxablePaise: number;
  gstPaise: number;
};

export type CreditNote = {
  orderNumber: string;
  at: string;
  taxablePaise: number;
  gstPaise: number;
  reason: string;
};

export type TaxReport = {
  month: string;
  slabs: TaxSlabRow[];
  hsn: HsnRow[];
  creditNotes: CreditNote[];
  totals: { taxablePaise: number; gstPaise: number; creditTaxablePaise: number; creditGstPaise: number };
};

/** Provisional footwear HSN map by the SKU's 3-letter category code. */
const HSN_BY_CODE: Record<string, { hsn: string; description: string }> = {
  SLI: { hsn: "6404", description: "Footwear with textile uppers — slides" },
  FLI: { hsn: "6404", description: "Footwear with textile uppers — flip-flops" },
  SAN: { hsn: "6404", description: "Footwear with textile uppers — sandals" },
  FLO: { hsn: "6404", description: "Footwear with textile uppers — floaters" },
  CLO: { hsn: "6405", description: "Other footwear — clogs" },
  SNE: { hsn: "6405", description: "Other footwear — sneakers" },
  CAS: { hsn: "6405", description: "Other footwear — casual shoes" },
  SCH: { hsn: "6405", description: "Other footwear — school shoes" },
};

const HSN_FALLBACK = { hsn: "6405", description: "Other footwear" };

export function hsnForSku(sku: string): { hsn: string; description: string } {
  const code = sku.split("-")[1] ?? "";
  return HSN_BY_CODE[code.toUpperCase()] ?? HSN_FALLBACK;
}

export function taxReport(orders: Order[], month: string): TaxReport {
  const slabs = new Map<number, TaxSlabRow>();
  const hsn = new Map<string, HsnRow>();
  const creditNotes: CreditNote[] = [];

  const addLine = (
    sku: string,
    units: number,
    taxablePaise: number,
    gstPaise: number,
    rateBps: number,
  ) => {
    const slabLabel = rateBps === 500 ? "5% (unit ≤ ₹2,500)" : "18% (unit > ₹2,500)";
    const slab = slabs.get(rateBps) ?? { slabLabel, rateBps, taxablePaise: 0, gstPaise: 0, units: 0 };
    slab.taxablePaise += taxablePaise;
    slab.gstPaise += gstPaise;
    slab.units += units;
    slabs.set(rateBps, slab);

    const mapped = hsnForSku(sku);
    const row = hsn.get(mapped.hsn) ?? { ...mapped, units: 0, taxablePaise: 0, gstPaise: 0 };
    row.units += units;
    row.taxablePaise += taxablePaise;
    row.gstPaise += gstPaise;
    hsn.set(mapped.hsn, row);
  };

  for (const order of orders) {
    const inMonth = istDayOf(order.createdAt).startsWith(month);
    if (!inMonth) continue;
    const credit = order.status === "refunded";
    if (!credit && !isLiveOrder(order)) continue;
    for (const item of order.items) {
      const taxable = itemNet(item);
      if (credit) {
        creditNotes.push({
          orderNumber: order.number,
          at: order.updatedAt,
          taxablePaise: -taxable,
          gstPaise: -item.taxPaise,
          reason: "Refund",
        });
        continue;
      }
      addLine(item.sku, item.qty, taxable, item.taxPaise, item.taxRateBps);
    }
  }

  const slabRows = [...slabs.values()].sort((a, b) => a.rateBps - b.rateBps);
  const totals = slabRows.reduce(
    (sum, row) => ({
      taxablePaise: sum.taxablePaise + row.taxablePaise,
      gstPaise: sum.gstPaise + row.gstPaise,
      creditTaxablePaise: 0,
      creditGstPaise: 0,
    }),
    { taxablePaise: 0, gstPaise: 0, creditTaxablePaise: 0, creditGstPaise: 0 },
  );
  totals.creditTaxablePaise = creditNotes.reduce((sum, note) => sum + note.taxablePaise, 0);
  totals.creditGstPaise = creditNotes.reduce((sum, note) => sum + note.gstPaise, 0);

  return {
    month,
    slabs: slabRows,
    hsn: [...hsn.values()].sort((a, b) => b.taxablePaise - a.taxablePaise),
    creditNotes,
    totals,
  };
}

/** CSV the CA can import — one row per slab plus credit-note rows. */
export function taxCsv(report: TaxReport): string {
  const lines = [
    "row_type,month,hsn,description,units,taxable_paise,gst_paise,rate_bps,order_number,note",
  ];
  for (const slab of report.slabs) {
    lines.push(
      ["slab", report.month, "", JSON.stringify(slab.slabLabel), slab.units, slab.taxablePaise, slab.gstPaise, slab.rateBps, "", ""].join(","),
    );
  }
  for (const row of report.hsn) {
    lines.push(
      ["hsn", report.month, row.hsn, JSON.stringify(row.description), row.units, row.taxablePaise, row.gstPaise, "", "", ""].join(","),
    );
  }
  for (const note of report.creditNotes) {
    lines.push(
      ["credit_note", report.month, "", "", 0, note.taxablePaise, note.gstPaise, "", note.orderNumber, JSON.stringify(note.reason)].join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}
