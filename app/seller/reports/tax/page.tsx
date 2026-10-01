import Link from "next/link";

import { RangePicker } from "@/components/seller/RangePicker";
import { formatINR } from "@/lib/money";
import { taxReport, type CreditNote } from "@/lib/hub/reports/tax";
import { rangeFromParams, rangeLabel } from "@/lib/hub/reports/view";
import { listOrders } from "@/lib/store/engine";

export const metadata = { title: "GST report · Seller Hub" };
export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;

function creditTable(notes: CreditNote[]): React.ReactNode {
  if (notes.length === 0) {
    return <p className="py-6 text-center text-hub-body text-muted">No credit notes in this month.</p>;
  }
  return (
    <table className="w-full border-collapse text-hub-table">
      <thead>
        <tr className="border-b border-hairline text-left font-mono text-hub-label uppercase text-muted">
          <th className="py-2 pr-4 font-medium">Order</th>
          <th className="py-2 pr-4 font-medium">Issued (IST)</th>
          <th className="py-2 pr-4 font-medium">Reason</th>
          <th className="py-2 pr-4 text-right font-medium">Taxable</th>
          <th className="py-2 text-right font-medium">GST</th>
        </tr>
      </thead>
      <tbody>
        {notes.map((note) => (
          <tr key={note.orderNumber} className="border-b border-hairline last:border-0">
            <td className="py-2 pr-4 font-mono text-hub-id">{note.orderNumber}</td>
            <td className="py-2 pr-4 text-muted">{note.at.slice(0, 10)}</td>
            <td className="py-2 pr-4">{note.reason}</td>
            <td className="py-2 pr-4 text-right tabular">{formatINR(note.taxablePaise)}</td>
            <td className="py-2 text-right tabular">{formatINR(note.gstPaise)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function TaxReportPage({
  searchParams,
}: {
  searchParams: Promise<Search> | Search;
}) {
  const params = await Promise.resolve(searchParams);
  const range = rangeFromParams(params);
  const month = range.fromDay.slice(0, 7);
  const orders = await listOrders();
  const report = taxReport(orders, month);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-hub-title font-display">Monthly GST report</h1>
          <p className="mt-1 text-hub-body text-muted">
            Taxable value, GST by slab and HSN, plus credit notes for refunds. {rangeLabel(range)}
          </p>
        </div>
        <Link
          href={`/api/seller/reports/tax?kind=tax&month=${month}`}
          className="rounded-control border border-rule bg-paper px-3 py-2 font-mono text-hub-label uppercase transition-colors duration-quick hover:bg-linen"
        >
          GST CSV
        </Link>
      </div>

      <div
        className="mt-4 rounded-hub border border-warning/50 bg-warning-tint px-4 py-3 text-hub-body"
        role="note"
      >
        <strong className="font-semibold">Verify with your CA.</strong> This report is a
        hand-ready summary from store data — rates follow the footwear slabs (5% up to ₹2,500 per
        unit, 18% above) but your filing must match GSTR-1/GSTR-3B as filed.
      </div>

      <div className="mt-6">
        <RangePicker basePath="/seller/reports/tax" range={range} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-hub border border-hairline bg-paper p-4">
          <p className="font-mono text-hub-label uppercase text-muted">Taxable value</p>
          <p className="mt-1 text-hub-kpi font-display tabular">{formatINR(report.totals.taxablePaise)}</p>
        </div>
        <div className="rounded-hub border border-hairline bg-paper p-4">
          <p className="font-mono text-hub-label uppercase text-muted">GST payable</p>
          <p className="mt-1 text-hub-kpi font-display tabular text-red-ink">{formatINR(report.totals.gstPaise)}</p>
        </div>
        <div className="rounded-hub border border-hairline bg-paper p-4">
          <p className="font-mono text-hub-label uppercase text-muted">Credit notes (taxable)</p>
          <p className="mt-1 text-hub-kpi font-display tabular">{formatINR(report.totals.creditTaxablePaise)}</p>
        </div>
        <div className="rounded-hub border border-hairline bg-paper p-4">
          <p className="font-mono text-hub-label uppercase text-muted">Credit notes (GST)</p>
          <p className="mt-1 text-hub-kpi font-display tabular">{formatINR(report.totals.creditGstPaise)}</p>
        </div>
      </div>

      <section className="mt-6 rounded-hub border border-hairline bg-paper p-5">
        <h2 className="text-hub-section font-semibold">By rate slab</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-hub-table">
            <thead>
              <tr className="border-b border-hairline text-left font-mono text-hub-label uppercase text-muted">
                <th className="py-2 pr-4 font-medium">Slab</th>
                <th className="py-2 pr-4 text-right font-medium">Units</th>
                <th className="py-2 pr-4 text-right font-medium">Taxable</th>
                <th className="py-2 text-right font-medium">GST</th>
              </tr>
            </thead>
            <tbody>
              {report.slabs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted">
                    No sales in {month}.
                  </td>
                </tr>
              ) : (
                report.slabs.map((slab) => (
                  <tr key={slab.rateBps} className="border-b border-hairline last:border-0">
                    <td className="py-2 pr-4">{slab.slabLabel}</td>
                    <td className="py-2 pr-4 text-right tabular">{slab.units}</td>
                    <td className="py-2 pr-4 text-right tabular">{formatINR(slab.taxablePaise)}</td>
                    <td className="py-2 text-right tabular">{formatINR(slab.gstPaise)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-hub border border-hairline bg-paper p-5">
        <h2 className="text-hub-section font-semibold">By HSN</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-hub-table">
            <thead>
              <tr className="border-b border-hairline text-left font-mono text-hub-label uppercase text-muted">
                <th className="py-2 pr-4 font-medium">HSN</th>
                <th className="py-2 pr-4 font-medium">Description</th>
                <th className="py-2 pr-4 text-right font-medium">Units</th>
                <th className="py-2 pr-4 text-right font-medium">Taxable</th>
                <th className="py-2 text-right font-medium">GST</th>
              </tr>
            </thead>
            <tbody>
              {report.hsn.map((row) => (
                <tr key={row.hsn} className="border-b border-hairline last:border-0">
                  <td className="py-2 pr-4 font-mono text-hub-id">{row.hsn}</td>
                  <td className="py-2 pr-4 text-muted">{row.description}</td>
                  <td className="py-2 pr-4 text-right tabular">{row.units}</td>
                  <td className="py-2 pr-4 text-right tabular">{formatINR(row.taxablePaise)}</td>
                  <td className="py-2 text-right tabular">{formatINR(row.gstPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-hub border border-hairline bg-paper p-5">
        <h2 className="text-hub-section font-semibold">Credit notes</h2>
        <div className="mt-4 overflow-x-auto">{creditTable(report.creditNotes)}</div>
      </section>
    </div>
  );
}
