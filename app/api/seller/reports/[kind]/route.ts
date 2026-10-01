import { NextResponse } from "next/server";

import { readSession } from "@/lib/auth/session";
import { productsCsv, productsReport } from "@/lib/hub/reports/products";
import { salesCsv, salesByDate } from "@/lib/hub/reports/sales";
import { settlementCsv } from "@/lib/hub/reports/settlements";
import { taxCsv, taxReport } from "@/lib/hub/reports/tax";
import {
  compareOf,
  csvFilename,
  rangeFromParams,
} from "@/lib/hub/reports/view";
import {
  listEvents,
  listOrders,
  listReturnsForReport,
  listSettlementItems,
  listSettlements,
} from "@/lib/store/engine";

type Params = { params: Promise<{ kind: string }> };
type Search = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function csv(body: string, filename: string): NextResponse {
  return new NextResponse(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

/**
 * GET /api/seller/reports/[kind] — CSV exports for the report pages.
 * Same query contract as the pages (preset/from/to) so links stay shareable.
 */
export async function GET(request: Request, { params }: Params): Promise<NextResponse> {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const { kind } = await params;
  const url = new URL(request.url);
  const search: Search = Object.fromEntries(url.searchParams.entries());
  const what = one(search.kind) ?? "sales";

  if (kind === "business") {
    const range = rangeFromParams(search);
    const previous = compareOf(range);
    const [orders, events, returns] = await Promise.all([
      listOrders(),
      listEvents(
        `${previous.fromDay}T00:00:00.000Z`,
        `${range.toDay}T23:59:59.999Z`,
      ),
      listReturnsForReport(),
    ]);
    if (what === "products") {
      const rows = productsReport({ orders, events, returns, range });
      return csv(productsCsv(rows), csvFilename("products", range));
    }
    const report = salesByDate(orders, events, range);
    return csv(salesCsv(report.rows), csvFilename("sales", range));
  }

  if (kind === "payments") {
    const [settlements, items, orders] = await Promise.all([
      listSettlements(),
      listSettlementItems(),
      listOrders(),
    ]);
    const settlementId = one(search.settlement);
    const scopedItems = settlementId
      ? items.filter((item) => item.settlementId === settlementId)
      : items;
    const scopedSettlements = settlementId
      ? settlements.filter((row) => row.id === settlementId)
      : settlements;
    return csv(
      settlementCsv(scopedSettlements, scopedItems, orders),
      settlementId ? `${settlementId}.csv` : "settlements.csv",
    );
  }

  if (kind === "tax") {
    const month = (one(search.month) ?? new Date().toISOString().slice(0, 7)).slice(0, 7);
    const orders = await listOrders();
    return csv(taxCsv(taxReport(orders, month)), `gst_${month}.csv`);
  }

  return NextResponse.json({ ok: false }, { status: 404 });
}
