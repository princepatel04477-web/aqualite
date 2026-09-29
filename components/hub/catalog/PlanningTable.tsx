"use client";

import { useState, useTransition } from "react";
import { savePlanningSettingsAction } from "@/lib/hub/catalog/actions";
import type { InventoryRow } from "@/lib/hub/catalog/rows";
import { useRouter } from "next/navigation";

export function PlanningTable({ rows, leadDays, targetDays }: { rows: InventoryRow[]; leadDays: number; targetDays: number }) {
  const router = useRouter();
  const [lead, setLead] = useState(leadDays);
  const [target, setTarget] = useState(targetDays);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [saving, startTransition] = useTransition();
  function exportOrder() {
    const csv = [["SKU", "Product", "On hand", "Available", "30d units", "Suggested reorder"], ...rows.filter((row) => row.plan.reorderQty > 0).map((row) => [row.sku, `${row.productName} / ${row.colorway}`, row.onHand, row.available, row.plan.sold30, row.plan.reorderQty])].map((cols) => cols.map((item) => `"${String(item).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); const a = document.createElement("a"); a.href = url; a.download = "purchase-order.csv"; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div><form className="mb-5 flex flex-wrap items-end gap-3 border border-hairline bg-porcelain p-4 text-small" onSubmit={(event) => { event.preventDefault(); startTransition(async () => { const result = await savePlanningSettingsAction({ leadTimeDays: lead, targetCoverDays: target }); if (!result.ok) setError(result.error.message); else { setError(""); router.refresh(); } }); }}>
    <label>Lead time · days <input className="hub-input w-28" type="number" min={1} max={180} value={lead} onChange={(event) => setLead(Number(event.target.value))} /></label>
    <label>Target cover · days <input className="hub-input w-28" type="number" min={1} max={365} value={target} onChange={(event) => setTarget(Number(event.target.value))} /></label>
    <button disabled={saving} type="submit" className="border border-aqua px-4 py-2 text-aqua">{saving ? "Saving…" : "Save planning settings"}</button><button type="button" onClick={exportOrder} className="ml-auto text-aqua">Export purchase-order CSV ↗</button>
    {error && <p role="alert" className="basis-full text-danger">{error}</p>}
  </form>
  <div className="max-h-[680px] overflow-auto border border-hairline bg-porcelain"><table className="w-full min-w-[900px] text-left text-small"><thead className="sticky top-0 bg-porcelain font-mono text-eyebrow uppercase text-mist"><tr><th className="p-3">SKU</th><th>Available</th><th>Sold 7d</th><th>Sold 30d</th><th>Sold 90d</th><th>Velocity / day</th><th>Days cover</th><th>Reorder qty</th><th>Status</th></tr></thead>
  <tbody>{rows.slice(page * 100, page * 100 + 100).map((row) => <tr key={row.id} className="border-t border-hairline"><td className="p-3 font-mono" title={`${row.productName} / ${row.colorway}`}>{row.sku}</td><td>{row.available}</td><td>{row.plan.sold7}</td><td>{row.plan.sold30}</td><td>{row.plan.sold90}</td><td>{row.plan.velocity.toFixed(2)}</td><td>{row.plan.daysCover === null ? "—" : row.plan.daysCover.toFixed(1)}</td><td className="font-mono">{row.plan.reorderQty}</td><td className={row.plan.status === "Restock now" ? "text-danger" : row.plan.status === "Restock soon" ? "text-warning" : "text-success"}>{row.plan.status}</td></tr>)}</tbody></table></div><div className="mt-3 flex items-center gap-3 text-small"><button disabled={page === 0} onClick={() => setPage(page - 1)} className="text-aqua disabled:opacity-40">← Previous</button><span>Page {page + 1} / {Math.max(1, Math.ceil(rows.length / 100))}</span><button disabled={(page + 1) * 100 >= rows.length} onClick={() => setPage(page + 1)} className="text-aqua disabled:opacity-40">Next →</button></div></div>;
}
