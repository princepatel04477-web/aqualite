/**
 * Sales & traffic by date: sessions, page views, units, ordered sales,
 * orders, conversion (orders ÷ sessions) and AOV — with a previous-period
 * comparison.
 */

import type { Order } from "@/lib/commerce/types";
import type { AnalyticsEvent } from "@/lib/store/engine";
import { istDayOf } from "@/lib/time/ist";
import { bps, isLiveOrder, salesOf, unitsOf } from "@/lib/hub/reports/orders";
import { inRange, rangeDays, type DateRange } from "@/lib/hub/reports/range";

export type SalesRow = {
  day: string;
  sessions: number;
  pageViews: number;
  units: number;
  salesPaise: number;
  orders: number;
  conversionBps: number;
  aovPaise: number;
};

export type SalesTotals = {
  sessions: number;
  pageViews: number;
  units: number;
  salesPaise: number;
  orders: number;
  conversionBps: number;
  aovPaise: number;
};

export type SalesReport = {
  rows: SalesRow[];
  totals: SalesTotals;
  previous: SalesTotals;
};

function emptyTotals(): SalesTotals {
  return { sessions: 0, pageViews: 0, units: 0, salesPaise: 0, orders: 0, conversionBps: 0, aovPaise: 0 };
}

function trafficByDay(events: AnalyticsEvent[], range: DateRange): {
  sessions: Map<string, Set<string>>;
  views: Map<string, number>;
} {
  const sessions = new Map<string, Set<string>>();
  const views = new Map<string, number>();
  for (const event of events) {
    if (event.type !== "page_view" || !inRange(event.at, range)) continue;
    const day = istDayOf(event.at);
    views.set(day, (views.get(day) ?? 0) + 1);
    const set = sessions.get(day) ?? new Set<string>();
    set.add(event.sessionId);
    sessions.set(day, set);
  }
  return { sessions, views };
}

export function salesByDate(orders: Order[], events: AnalyticsEvent[], range: DateRange): SalesReport {
  const { sessions, views } = trafficByDay(events, range);
  const rows: SalesRow[] = rangeDays(range).map((day) => {
    const dayOrders = orders.filter((order) => isLiveOrder(order) && istDayOf(order.createdAt) === day);
    const salesPaise = salesOf(dayOrders);
    const orderCount = dayOrders.length;
    const sessionCount = sessions.get(day)?.size ?? 0;
    return {
      day,
      sessions: sessionCount,
      pageViews: views.get(day) ?? 0,
      units: unitsOf(dayOrders),
      salesPaise,
      orders: orderCount,
      conversionBps: bps(orderCount, sessionCount),
      aovPaise: orderCount ? Math.round(salesPaise / orderCount) : 0,
    };
  });
  const totals = rows.reduce<SalesTotals>(
    (sum, row) => ({
      sessions: sum.sessions + row.sessions,
      pageViews: sum.pageViews + row.pageViews,
      units: sum.units + row.units,
      salesPaise: sum.salesPaise + row.salesPaise,
      orders: sum.orders + row.orders,
      conversionBps: 0,
      aovPaise: 0,
    }),
    emptyTotals(),
  );
  totals.conversionBps = bps(totals.orders, totals.sessions);
  totals.aovPaise = totals.orders ? Math.round(totals.salesPaise / totals.orders) : 0;
  return { rows, totals, previous: emptyTotals() };
}

/** Same report with the previous-period totals filled in. */
export function salesReportWithCompare(
  orders: Order[],
  events: AnalyticsEvent[],
  range: DateRange,
  previous: DateRange,
): SalesReport {
  const current = salesByDate(orders, events, range);
  const before = salesByDate(orders, events, previous);
  return { rows: current.rows, totals: current.totals, previous: before.totals };
}

export function salesCsv(rows: SalesRow[]): string {
  const header = "day,sessions,page_views,units,sales_paise,orders,conversion_bps,aov_paise";
  const body = rows
    .map((row) =>
      [row.day, row.sessions, row.pageViews, row.units, row.salesPaise, row.orders, row.conversionBps, row.aovPaise].join(","),
    )
    .join("\n");
  return `${header}\n${body}\n`;
}
