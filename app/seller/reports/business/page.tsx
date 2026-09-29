import Link from "next/link";

import { ChartBlock, StatCard } from "@/components/seller/ChartBlock";
import { RangePicker } from "@/components/seller/RangePicker";
import { FunnelBars, SalesAreaChart } from "@/components/seller/charts";
import { formatINR } from "@/lib/money";
import { funnelReport } from "@/lib/hub/reports/funnel";
import { productsReport, type ProductRow } from "@/lib/hub/reports/products";
import { rangeWindow } from "@/lib/hub/reports/range";
import { salesByDate, salesReportWithCompare, type SalesRow } from "@/lib/hub/reports/sales";
import {
  compareOf,
  dayLabel,
  rangeFromParams,
  rangeLabel,
} from "@/lib/hub/reports/view";
import {
  listEvents,
  listOrders,
  listReturnsForReport,
} from "@/lib/store/engine";

export const metadata = { title: "Business reports · Seller Hub" };
export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;

function salesTable(rows: SalesRow[]): React.ReactNode {
  return (
    <table className="w-full border-collapse text-hub-table">
      <thead>
        <tr className="border-b border-hairline text-left font-mono text-hub-label uppercase text-muted">
          <th className="py-2 pr-3 font-medium">IST day</th>
          <th className="py-2 pr-3 text-right font-medium">Sessions</th>
          <th className="py-2 pr-3 text-right font-medium">Units</th>
          <th className="py-2 pr-3 text-right font-medium">Orders</th>
          <th className="py-2 text-right font-medium">Sales</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.day} className="border-b border-hairline last:border-0">
            <td className="py-2 pr-3 font-mono text-hub-id">{dayLabel(row.day)}</td>
            <td className="py-2 pr-3 text-right tabular">{row.sessions}</td>
            <td className="py-2 pr-3 text-right tabular">{row.units}</td>
            <td className="py-2 pr-3 text-right tabular">{row.orders}</td>
            <td className="py-2 text-right tabular">{formatINR(row.salesPaise)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function productTable(rows: ProductRow[]): React.ReactNode {
  return (
    <table className="w-full border-collapse text-hub-table">
      <thead>
        <tr className="border-b border-hairline text-left font-mono text-hub-label uppercase text-muted">
          <th className="py-2 pr-3 font-medium">Product</th>
          <th className="py-2 pr-3 text-right font-medium">Units</th>
          <th className="py-2 pr-3 text-right font-medium">Sessions</th>
          <th className="py-2 pr-3 text-right font-medium">Return rate</th>
          <th className="py-2 text-right font-medium">Sales</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.productId} className="border-b border-hairline last:border-0">
            <td className="py-2 pr-3">
              <Link href={`/seller/performance/health`} className="font-medium text-red-ink">
                {row.productName}
              </Link>
              <p className="font-mono text-hub-id text-muted">{row.sku ?? row.productId}</p>
            </td>
            <td className="py-2 pr-3 text-right tabular">{row.units}</td>
            <td className="py-2 pr-3 text-right tabular">{row.sessions}</td>
            <td className="py-2 pr-3 text-right tabular">{(row.returnRateBps / 100).toFixed(1)}%</td>
            <td className="py-2 text-right tabular">{formatINR(row.salesPaise)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function BusinessReportsPage({
  searchParams,
}: {
  searchParams: Promise<Search> | Search;
}) {
  const params = await Promise.resolve(searchParams);
  const range = rangeFromParams(params);
  const previous = compareOf(range);
  const window = rangeWindow({
    ...previous,
    fromDay: previous.fromDay,
    toDay: range.toDay,
  });

  const [orders, events, returns] = await Promise.all([
    listOrders(),
    listEvents(window.fromIso, window.toIso),
    listReturnsForReport(),
  ]);

  const report = salesReportWithCompare(orders, events, range, previous);
  const previousRows = salesByDate(orders, events, previous).rows;
  const funnel = funnelReport(events, range);
  const products = productsReport({ orders, events, returns, range });

  const funnelTable = (
    <table className="w-full border-collapse text-hub-table">
      <thead>
        <tr className="border-b border-hairline text-left font-mono text-hub-label uppercase text-muted">
          <th className="py-2 pr-3 font-medium">Step</th>
          <th className="py-2 pr-3 text-right font-medium">Sessions</th>
          <th className="py-2 pr-3 text-right font-medium">Of top</th>
          <th className="py-2 text-right font-medium">Step conv.</th>
        </tr>
      </thead>
      <tbody>
        {funnel.map((step) => (
          <tr key={step.key} className="border-b border-hairline last:border-0">
            <td className="py-2 pr-3">{step.label}</td>
            <td className="py-2 pr-3 text-right tabular">{step.sessions}</td>
            <td className="py-2 pr-3 text-right tabular">{(step.ofTopBps / 100).toFixed(1)}%</td>
            <td className="py-2 text-right tabular">{(step.stepBps / 100).toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const query = `preset=${range.preset}&from=${range.fromDay}&to=${range.toDay}`;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-hub-title font-display">Business reports</h1>
          <p className="mt-1 text-hub-body text-muted">
            Sales and traffic by IST day, with the previous period for comparison. {rangeLabel(range)}
          </p>
        </div>
        <div className="flex gap-2 font-mono text-hub-label uppercase">
          <Link
            href={`/api/seller/reports/business?${query}&kind=sales`}
            className="rounded-control border border-rule bg-paper px-3 py-2 transition-colors duration-quick hover:bg-linen"
          >
            Sales CSV
          </Link>
          <Link
            href={`/api/seller/reports/business?${query}&kind=products`}
            className="rounded-control border border-rule bg-paper px-3 py-2 transition-colors duration-quick hover:bg-linen"
          >
            Products CSV
          </Link>
          <Link
            href={`/seller/reports/tax?preset=${range.preset}&from=${range.fromDay}&to=${range.toDay}`}
            className="rounded-control border border-rule bg-paper px-3 py-2 transition-colors duration-quick hover:bg-linen"
          >
            GST report
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <RangePicker basePath="/seller/reports/business" range={range} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sales (net of discounts)"
          value={formatINR(report.totals.salesPaise)}
          sub={`${report.previous.salesPaise > 0 ? `${((report.totals.salesPaise - report.previous.salesPaise) / report.previous.salesPaise * 100).toFixed(1)}% vs previous` : "no previous data"}`}
          accent="red"
        />
        <StatCard
          label="Orders"
          value={String(report.totals.orders)}
          sub={`${report.totals.units} units · ${formatINR(report.totals.aovPaise)} AOV`}
        />
        <StatCard
          label="Sessions"
          value={String(report.totals.sessions)}
          sub={`${report.totals.pageViews} page views`}
        />
        <StatCard
          label="Conversion"
          value={`${(report.totals.conversionBps / 100).toFixed(2)}%`}
          sub={`orders ÷ sessions · ${report.rows.length} IST days`}
          accent="aqua"
        />
      </div>

      <ChartBlock
        title="Sales & traffic"
        note="Solid: this period · Dashed: previous period"
        chart={
          <SalesAreaChart
            data={report.rows.map((row, index) => ({
              day: dayLabel(row.day),
              salesPaise: row.salesPaise,
              previousPaise: previousRows[index]?.salesPaise ?? 0,
            }))}
          />
        }
        table={salesTable(report.rows)}
      />

      <ChartBlock
        title="Conversion funnel"
        note="Distinct sessions per step"
        chart={<FunnelBars data={funnel} />}
        table={funnelTable}
      />

      <section className="mt-6 rounded-hub border border-hairline bg-paper p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-hub-section font-semibold">By product</h2>
          <p className="text-hub-label text-muted">
            Item-level totals — they sum exactly to the sales table above
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">{productTable(products)}</div>
      </section>
    </div>
  );
}
