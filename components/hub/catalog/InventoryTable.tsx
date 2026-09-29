"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { adjustInventoryAction, bulkStockAction, listingStatusAction, savePricesAction } from "@/lib/hub/catalog/actions";
import type { InventoryRow } from "@/lib/hub/catalog/rows";
import { effectivePrice, previewChange } from "@/lib/hub/pricing/effective";
import { formatINR } from "@/lib/money";

type Tab = "All" | "Active" | "Inactive" | "Out of stock" | "Low stock" | "Suppressed";
const tabs: Tab[] = ["All", "Active", "Inactive", "Out of stock", "Low stock", "Suppressed"];
type Item = { type: "group"; key: string; title: string; count: number; image: string } | { type: "row"; key: string; row: InventoryRow };

function datetimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function asCsv(value: string | number): string { return `"${String(value).replaceAll('"', '""')}"`; }
function downloadCsv(name: string, data: Array<Array<string | number>>) {
  const blob = new Blob([data.map((row) => row.map(asCsv).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function InventoryTable({ initial, mode = "inventory", initialTab = "All" }: { initial: InventoryRow[]; mode?: "inventory" | "pricing"; initialTab?: Tab }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [bulk, setBulk] = useState<"price" | "stock" | null>(null);
  const [modeChange, setModeChange] = useState<"percent" | "rupees" | "fixed">("percent");
  const [amount, setAmount] = useState(10);
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => setRows(initial), [initial]);
  const filtered = useMemo(() => rows.filter((row) => {
    const match = `${row.productName} ${row.colorway} ${row.sku}`.toLowerCase().includes(search.toLowerCase());
    if (!match) return false;
    switch (tab) {
      case "Active": return row.active && !row.suppressed.length && row.available > 0;
      case "Inactive": return !row.active;
      case "Out of stock": return row.available <= 0;
      case "Low stock": return row.available > 0 && (row.plan.status === "Restock now" || row.plan.status === "Restock soon");
      case "Suppressed": return !!row.suppressed.length;
      default: return true;
    }
  }), [rows, tab, search]);
  const items = useMemo(() => {
    const groups = new Map<string, InventoryRow[]>();
    for (const row of filtered) {
      const key = `${row.productId}:${row.colorway}`;
      const group = groups.get(key) ?? []; group.push(row); groups.set(key, group);
    }
    const list: Item[] = [];
    groups.forEach((group, key) => {
      const first = group[0];
      if (!first) return;
      list.push({ type: "group", key, title: `${first.productName} / ${first.colorway}`, image: first.image, count: group.length });
      if (!collapsed.has(key)) list.push(...group.map((row) => ({ type: "row" as const, key: row.id, row })));
    });
    return list;
  }, [filtered, collapsed]);
  const virtual = useVirtualizer({ count: items.length, getScrollElement: () => scrollRef.current, estimateSize: (index) => items[index]?.type === "group" ? 46 : 80, overscan: 6, getItemKey: (index) => items[index]?.key ?? index });
  const pricingColumns = mode === "pricing";
  const gridColumns = pricingColumns
    ? "grid-cols-[40px_155px_1fr_82px_96px_72px_72px_92px_88px_95px_100px_100px_130px_90px_95px_125px_110px]"
    : "grid-cols-[40px_155px_1fr_82px_96px_72px_72px_92px_88px_95px_100px_95px_125px_110px]";
  const chosen = rows.filter((row) => selected.has(row.id));
  const preview = chosen.map((row) => ({ row, next: previewChange(row.pricePaise, modeChange, amount) }));
  const invalid = preview.some(({ row, next }) => !Number.isInteger(next) || next <= 0 || next > row.mrpPaise || (row.salePricePaise !== null && next < row.salePricePaise));

  function confirmPrice(row: InventoryRow, pricePaise: number, mrpPaise: number, salePricePaise?: number | null, saleStartsAt?: string | null, saleEndsAt?: string | null, costPaise?: number | null) {
    setError(""); setEditing(null);
    const previous = rows;
    setRows(rows.map((entry) => entry.id === row.id ? { ...entry, pricePaise, mrpPaise, effectivePaise: effectivePrice({ pricePaise, salePricePaise, saleStartsAt, saleEndsAt }), salePricePaise: salePricePaise ?? null, saleStartsAt: saleStartsAt ?? null, saleEndsAt: saleEndsAt ?? null, costPaise: costPaise ?? null } : entry));
    startTransition(async () => {
      const result = await savePricesAction([{ variantId: row.id, pricePaise, mrpPaise, salePricePaise, saleStartsAt, saleEndsAt, costPaise, expectedPricePaise: row.pricePaise }]);
      if (!result.ok) { setRows(previous); setError(result.error.message); }
      else { setNotice("Offer saved. Storefront price refreshed."); router.refresh(); }
    });
  }
  function confirmStock(row: InventoryRow, onHand: number, reason: "restock" | "adjustment" | "correction", note: string) {
    setError(""); setEditing(null);
    const previous = rows;
    setRows(rows.map((entry) => entry.id === row.id ? { ...entry, onHand, available: onHand - row.reserved } : entry));
    startTransition(async () => {
      const result = await adjustInventoryAction({ variantId: row.id, currentOnHand: row.onHand, onHand, reason, note });
      if (!result.ok) { setRows(previous); setError(result.error.message); }
      else { setNotice("Stock updated."); router.refresh(); }
    });
  }
  function applyBulk() {
    if (!chosen.length || (bulk === "price" && invalid)) return;
    const previous = rows;
    if (bulk === "price") {
      setRows(rows.map((row) => { const match = preview.find((item) => item.row.id === row.id); return match ? { ...row, pricePaise: match.next, effectivePaise: effectivePrice({ ...row, pricePaise: match.next }) } : row; }));
    } else setRows(rows.map((row) => selected.has(row.id) ? { ...row, onHand: row.onHand + amount, available: row.available + amount } : row));
    setBulk(null); setError("");
    startTransition(async () => {
      const result = bulk === "price"
        ? await savePricesAction(preview.map(({ row, next }) => ({ variantId: row.id, pricePaise: next, expectedPricePaise: row.pricePaise })))
        : await bulkStockAction(chosen.map((row) => ({ variantId: row.id, delta: amount })));
      if (!result.ok) { setRows(previous); setError(result.error.message); }
      else { setSelected(new Set()); setNotice(`${result.data.updated} SKUs updated.`); router.refresh(); }
    });
  }
  function changeStatus(active: boolean) {
    const previous = rows;
    setRows(rows.map((row) => selected.has(row.id) ? { ...row, active } : row));
    startTransition(async () => {
      const result = await listingStatusAction({ ids: [...selected], active });
      if (!result.ok) { setRows(previous); setError(result.error.message); }
      else { setSelected(new Set()); setNotice(`${result.data.updated} listings updated.`); router.refresh(); }
    });
  }
  async function labels() {
    const JsBarcode = (await import("jsbarcode")).default;
    const win = window.open("", "_blank");
    if (!win) { setError("Allow pop-ups to print labels."); return; }
    const labels = chosen.map((row) => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      JsBarcode(svg, row.sku, { format: "CODE128", displayValue: true, height: 38, width: 1.5, margin: 4 });
      return `<div class="label">${svg.outerHTML}</div>`;
    });
    win.document.write(`<html><head><title>SKU labels</title><style>@page{size:A4;margin:10mm}.sheet{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}.label{border:1px solid currentColor;padding:4mm;break-inside:avoid}svg{width:100%;height:auto}</style></head><body><div class="sheet">${labels.join("")}</div></body></html>`);
    win.document.close(); win.focus(); win.print();
  }
  return <div>
    <div className="flex flex-wrap items-center gap-2 text-small">
      {tabs.map((value) => <button key={value} onClick={() => { setTab(value); scrollRef.current?.scrollTo(0, 0); }} aria-pressed={tab === value} className={`border px-3 py-2 ${tab === value ? "border-aqua bg-aqua/10 text-aqua" : "border-hairline"}`}>{value} <span className="font-mono">{value === "All" ? rows.length : rows.filter((row) => value === "Active" ? row.active && !row.suppressed.length && row.available > 0 : value === "Inactive" ? !row.active : value === "Out of stock" ? !row.available : value === "Low stock" ? row.available > 0 && (row.plan.status === "Restock now" || row.plan.status === "Restock soon") : !!row.suppressed.length).length}</span></button>)}
    </div>
    <div className="my-4 flex flex-wrap items-center gap-3">
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product or SKU" aria-label="Search inventory" className="border border-hairline bg-porcelain px-3 py-2 text-small" />
      <button disabled={!filtered.length} onClick={() => setSelected(new Set(filtered.map((row) => row.id)))} className="text-small text-aqua disabled:opacity-50">Select view</button>
      <button onClick={() => setSelected(new Set())} className="text-small text-mist">Clear selection</button>
      <span className="font-mono text-eyebrow text-mist">{selected.size} selected</span>
      <button onClick={() => downloadCsv("inventory.csv", [["SKU", "Product", "Size UK", "On hand", "Reserved", "Price paise"], ...filtered.map((row) => [row.sku, row.productName, row.sizeUk, row.onHand, row.reserved, row.pricePaise])])} className="ml-auto text-small text-aqua">Export CSV ↗</button>
    </div>
    {selected.size > 0 && <div className="mb-3 flex flex-wrap gap-2 border border-hairline bg-porcelain p-3 text-small">
      <button onClick={() => changeStatus(true)} disabled={pending} className="text-aqua">Activate</button><button onClick={() => changeStatus(false)} disabled={pending} className="text-aqua">Deactivate</button>
      <button onClick={() => { setBulk("price"); setAmount(10); }} className="text-aqua">Bulk price · preview</button>
      <button onClick={() => { setBulk("stock"); setAmount(10); }} className="text-aqua">Add stock</button>
      <button onClick={() => void labels()} className="text-aqua">Print Code128 labels</button>
    </div>}
    {error && <p role="alert" className="mb-3 text-small text-danger">{error}</p>}
    {notice && <p role="status" className="mb-3 text-small text-success">{notice}</p>}
    {bulk && <div role="dialog" aria-label="Bulk update preview" className="mb-4 border border-aqua bg-porcelain p-5 text-small">
      <h2 className="font-display text-h3">{bulk === "price" ? "Preview price changes" : "Preview stock addition"}</h2>
      <div className="mt-3 flex gap-3">{bulk === "price" && <select value={modeChange} onChange={(event) => setModeChange(event.target.value as typeof modeChange)} className="border border-hairline bg-porcelain px-2"><option value="percent">Change by %</option><option value="rupees">Change by ₹</option><option value="fixed">Set price ₹</option></select>}
        <input aria-label="Amount" type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value))} className="w-28 border border-hairline bg-porcelain px-2 py-1 font-mono" /></div>
      <div className="mt-4 max-h-48 overflow-y-auto border-y border-hairline">{preview.map(({ row, next }) => <div key={row.id} className="flex justify-between border-t border-hairline py-2 font-mono"><span>{row.sku}</span><span>{bulk === "price" ? `${formatINR(row.pricePaise)} → ${Number.isInteger(next) ? formatINR(next) : "Invalid amount"}${next > row.mrpPaise ? " · exceeds MRP" : ""}` : `${row.onHand} → ${row.onHand + amount}`}</span></div>)}</div>
      {invalid && bulk === "price" && <p className="mt-2 text-danger">Some prices exceed MRP, undercut a scheduled sale, or are not positive. Adjust before applying.</p>}
      <div className="mt-4 flex gap-4"><button disabled={pending || invalid || !Number.isFinite(amount) || (bulk === "stock" && (!Number.isInteger(amount) || amount <= 0))} onClick={applyBulk} className="bg-aqua px-4 py-2 text-porcelain disabled:opacity-50">Apply to {chosen.length} SKUs</button><button onClick={() => setBulk(null)}>Cancel</button></div>
    </div>}
    <div className="overflow-x-auto border border-hairline bg-porcelain"><div className={pricingColumns ? "min-w-[1640px]" : "min-w-[1280px]"}>
      <div className={`grid ${gridColumns} gap-2 border-b border-hairline px-3 py-3 font-mono text-eyebrow uppercase text-mist`}>
        <span /><span>SKU</span><span>Product / colourway</span><span>UK size</span><span>Status</span><span>Avail.</span><span>Reserved</span><span>On hand</span><span>Price</span><span>MRP</span><span>Sale</span>{pricingColumns && <><span>Effective</span><span>Sale window</span><span>Margin</span></>}<span>Cover</span><span>Last sold</span><span>Updated</span>
      </div>
      <div ref={scrollRef} className="h-[600px] overflow-y-auto" role="table" aria-label="Inventory by SKU">
        <div style={{ height: `${virtual.getTotalSize()}px`, position: "relative" }}>
          {virtual.getVirtualItems().map((slot) => { const item = items[slot.index]; if (!item) return null;
            return <div key={item.key} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: `${slot.size}px`, transform: `translateY(${slot.start}px)` }}>
              {item.type === "group" ? <button onClick={() => setCollapsed((prev) => { const copy = new Set(prev); if (copy.has(item.key)) copy.delete(item.key); else copy.add(item.key); return copy; })} aria-expanded={!collapsed.has(item.key)} className="flex h-full w-full items-center gap-3 border-b border-hairline bg-abyss px-3 text-left font-medium"><span className="text-aqua">{collapsed.has(item.key) ? "+" : "−"}</span>{item.image && <img src={item.image} alt="" className="h-8 w-8 object-cover" />}{item.title}<span className="font-mono text-eyebrow text-mist">{item.count} SKUs</span></button>
                : <div className={`grid h-full ${gridColumns} items-center gap-2 border-b border-hairline px-3 text-small ${selected.has(item.row.id) ? "bg-aqua/10" : ""}`}>
                  <input type="checkbox" aria-label={`Select ${item.row.sku}`} checked={selected.has(item.row.id)} onChange={() => setSelected((prev) => { const copy = new Set(prev); if (copy.has(item.row.id)) copy.delete(item.row.id); else copy.add(item.row.id); return copy; })} />
                  <span className="truncate font-mono text-size" title={item.row.sku}>{item.row.sku}</span>
                  <span className="truncate" title={`${item.row.productName} / ${item.row.colorway}`}>{item.row.productName} / {item.row.colorway}</span>
                  <span className="font-mono">{item.row.sizeUk}</span>
                  <span title={item.row.suppressed.join(", ")} className={item.row.suppressed.length ? "text-danger" : item.row.active ? "text-success" : "text-mist"}>{item.row.suppressed.length ? <Link href="/seller/catalog/images" className="underline">Fix listing</Link> : item.row.active ? "Active" : "Inactive"}</span>
                  <span className="font-mono tabular">{item.row.available}</span><span className="font-mono tabular">{item.row.reserved}</span>
                  <button onClick={() => setEditing(`stock:${item.row.id}`)} className="text-left font-mono tabular text-aqua underline" aria-label={`Edit stock ${item.row.sku}`}>{item.row.onHand}</button>
                  <button onClick={() => setEditing(`price:${item.row.id}`)} className="text-left font-mono tabular text-aqua underline" aria-label={`Edit price ${item.row.sku}`}>{formatINR(item.row.pricePaise)}</button>
                  <span className="font-mono tabular">{formatINR(item.row.mrpPaise)}</span><span className="font-mono tabular">{item.row.salePricePaise !== null ? formatINR(item.row.salePricePaise) : "—"}</span>{pricingColumns && <><span className="font-mono tabular">{formatINR(item.row.effectivePaise)}</span><span className="truncate font-mono text-eyebrow" title={item.row.saleStartsAt && item.row.saleEndsAt ? `${item.row.saleStartsAt} → ${item.row.saleEndsAt}` : "No sale window"}>{item.row.saleStartsAt ? `${item.row.saleStartsAt.slice(0, 16)} → ${item.row.saleEndsAt?.slice(0, 16)}` : "—"}</span><span className="font-mono tabular">{item.row.costPaise === null ? "—" : `${Math.round((item.row.effectivePaise - item.row.costPaise) / item.row.effectivePaise * 100)}%`}</span></>}
                  <span className="font-mono tabular">{item.row.plan.daysCover === null ? "—" : item.row.plan.daysCover.toFixed(1)}</span>
                  <span title={item.row.lastSoldAt ?? "Never"} className="truncate font-mono text-eyebrow">{item.row.lastSoldAt?.slice(0, 10) ?? "Never"}</span>
                  <span title={item.row.updatedAt} className="truncate font-mono text-eyebrow">{item.row.updatedAt?.slice(0, 10) ?? "—"}</span>
                </div>}
            </div>;
          })}
        </div>
      </div>
    </div></div>
    {editing && <EditOffer row={rows.find((row) => row.id === editing.split(":")[1])} kind={editing.startsWith("stock:") ? "stock" : "price"} mode={mode} onClose={() => setEditing(null)} onPrice={confirmPrice} onStock={confirmStock} />}
  </div>;
}

function EditOffer({ row, kind, mode, onClose, onPrice, onStock }: { row?: InventoryRow; kind: "price" | "stock"; mode: "inventory" | "pricing"; onClose: () => void; onPrice: (row: InventoryRow, price: number, mrp: number, sale?: number | null, starts?: string | null, ends?: string | null, cost?: number | null) => void; onStock: (row: InventoryRow, onHand: number, reason: "restock" | "adjustment" | "correction", note: string) => void }) {
  const [error, setError] = useState("");
  if (!row) return null;
  return <div className="fixed inset-0 z-modal grid place-items-center bg-foam/30 p-4" onClick={onClose}>
    <form onClick={(event) => event.stopPropagation()} onSubmit={(event) => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      if (kind === "stock") {
        const qty = Number(form.get("onHand")); const reason = String(form.get("reason")) as "restock" | "adjustment" | "correction"; const note = String(form.get("note") ?? "");
        if (!Number.isInteger(qty) || qty < row.reserved || note.length < 2) { setError("On hand must cover reserved units. Enter a reason note."); return; }
        onStock(row, qty, reason, note);
      } else {
        const price = Math.round(Number(form.get("price")) * 100); const mrp = Math.round(Number(form.get("mrp")) * 100);
        const saleText = String(form.get("sale") ?? ""); const sale = saleText ? Math.round(Number(saleText) * 100) : null;
        const startText = String(form.get("start") ?? ""); const endText = String(form.get("end") ?? "");
        const starts = startText ? new Date(startText).toISOString() : null; const ends = endText ? new Date(endText).toISOString() : null;
        const costText = String(form.get("cost") ?? ""); const cost = costText ? Math.round(Number(costText) * 100) : null;
        if (!Number.isInteger(price) || price <= 0 || !Number.isInteger(mrp) || mrp < price || (sale === null && (starts || ends)) || (sale !== null && (sale <= 0 || sale > price || !starts || !ends || starts >= ends))) { setError("MRP must cover price; sale must be below price with a valid start and end."); return; }
        onPrice(row, price, mrp, sale, starts, ends, cost);
      }
    }} className="w-full max-w-lg border border-hairline bg-porcelain p-6 shadow-xl">
      <h2 className="font-display text-h3">{kind === "stock" ? "Adjust on-hand stock" : "Edit offer"}</h2><p className="mt-1 font-mono text-small text-mist">{row.sku}</p>
      {kind === "stock" ? <div className="mt-5 grid gap-3"><label>On hand <input type="number" name="onHand" defaultValue={row.onHand} min={row.reserved} required className="hub-input" /></label>
        <label>Reason <select name="reason" className="hub-input"><option value="restock">Restock</option><option value="adjustment">Adjustment</option><option value="correction">Correction</option></select></label>
        <label>Note <input name="note" required minLength={2} className="hub-input" placeholder="Why is stock changing?" /></label></div>
        : <div className="mt-5 grid grid-cols-2 gap-3"><label>Price ₹ <input type="number" name="price" min="0.01" step="0.01" defaultValue={row.pricePaise / 100} required className="hub-input" /></label>
          <label>MRP ₹ <input type="number" name="mrp" min="0.01" step="0.01" defaultValue={row.mrpPaise / 100} required className="hub-input" /></label>
          <label>Sale price ₹ <input type="number" name="sale" min="0.01" step="0.01" defaultValue={row.salePricePaise ? row.salePricePaise / 100 : ""} className="hub-input" /></label>
          <label>Cost ₹ · owner only <input type="number" name="cost" min="0" step="0.01" defaultValue={row.costPaise !== null ? row.costPaise / 100 : ""} className="hub-input" /></label>
          <label>Sale begins <input type="datetime-local" name="start" defaultValue={datetimeLocal(row.saleStartsAt)} className="hub-input" /></label>
          <label>Sale ends <input type="datetime-local" name="end" defaultValue={datetimeLocal(row.saleEndsAt)} className="hub-input" /></label>
          {mode === "pricing" && <p className="col-span-2 text-small text-mist">Effective now: {formatINR(row.effectivePaise)} · Margin: {row.costPaise === null ? "No cost recorded" : `${Math.round((row.effectivePaise - row.costPaise) / row.effectivePaise * 100)}%`}</p>}
        </div>}
      {error && <p role="alert" className="mt-3 text-danger">{error}</p>}
      <div className="mt-5 flex gap-4"><button type="submit" className="bg-aqua px-4 py-2 text-porcelain">Save</button><button type="button" onClick={onClose}>Cancel</button></div>
    </form>
  </div>;
}
