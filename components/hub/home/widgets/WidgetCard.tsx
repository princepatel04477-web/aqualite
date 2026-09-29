"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { RollingDigits } from "@/components/motion/RollingDigits";
import { widgetTitles } from "@/lib/hub/widget-config";
import { refreshWidget } from "@/lib/hub/widget-actions";
import type { CountLink, WidgetData, WidgetId } from "@/lib/hub/metrics";
import { formatINR } from "@/lib/money";

const viewLinks: Record<WidgetId, string> = {
  sales: "/admin/orders", orders: "/admin/orders", action: "/admin/orders", inventory: "/admin/inventory",
  health: "/seller", payments: "/seller", products: "/admin/inventory", notifications: "/admin/orders",
};

function TimeLabel({ at }: { at: string }) {
  const [text, setText] = useState("Just now");
  useEffect(() => {
    const update = () => {
      const seconds = Math.max(0, Math.floor((Date.now() - new Date(at).getTime()) / 1000));
      setText(seconds < 60 ? `${seconds}s ago` : `${Math.floor(seconds / 60)}m ago`);
    };
    update();
    const timer = window.setInterval(update, 10000);
    return () => window.clearInterval(timer);
  }, [at]);
  return <time dateTime={at} title={new Date(at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}>Updated {text}</time>;
}

function Change({ current, previous }: { current: number; previous: number }) {
  if (!previous) return <span className="text-mist">No prior period</span>;
  const pct = Math.round((current - previous) / previous * 100);
  return <span className={pct < 0 ? "text-danger" : pct > 0 ? "text-success" : "text-mist"}>
    {pct > 0 ? "↑" : pct < 0 ? "↓" : "→"} {Math.abs(pct)}% {pct > 0 ? "up" : pct < 0 ? "down" : "unchanged"}
  </span>;
}

function Metric({ label, current, previous, money = false }: { label: string; current: number; previous: number; money?: boolean }) {
  return <div className="min-w-0">
    <p className="text-eyebrow uppercase tracking-wide text-mist">{label}</p>
    <p className="mt-1 font-mono text-small font-medium tabular">{money ? formatINR(current) : <RollingDigits value={current} />}</p>
    <p className="mt-1 text-eyebrow"><Change current={current} previous={previous} /></p>
  </div>;
}

function Sales({ value }: { value: Extract<WidgetData, { kind: "sales" }>["value"] }) {
  const max = Math.max(1, ...value.daily);
  const points = value.daily.map((amount, index) => `${index * 10},${40 - amount / max * 36}`).join(" ");
  return <div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {value.periods.map((period) => <div key={period.label} className="border border-hairline p-3">
        <h3 className="mb-4 font-mono text-eyebrow uppercase tracking-wide text-mist">{period.label}</h3>
        <div className="grid grid-cols-2 gap-3">
          {([ ["Sales", "revenuePaise", true], ["Units", "units", false], ["Orders", "orders", false], ["AOV", "aovPaise", true] ] as const).map(([label, key, money]) =>
            <Metric key={key} label={label} current={period.current[key]} previous={period.previous[key]} money={money} />)}
        </div>
      </div>)}
    </div>
    <div className="mt-5 border-t border-hairline pt-3"><p className="font-mono text-eyebrow uppercase text-mist">Daily ordered product sales · 30 days</p>
      <svg className="mt-2 h-12 w-full text-aqua" viewBox="0 0 290 40" preserveAspectRatio="none" role="img" aria-label="30-day sales trend"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>
    </div>
  </div>;
}

function Counts({ rows }: { rows: CountLink[] }) {
  return <ul className="divide-y divide-hairline">{rows.map((row) => <li key={row.label}>
    {row.count === null ? <div className="flex justify-between gap-3 py-3 text-small text-mist"><span>{row.label}</span><span>Not connected</span></div> :
      <Link className="flex items-center justify-between gap-3 py-3 text-small hover:text-aqua" href={row.href}>
        <span>{row.label}</span><span className={`font-mono tabular ${row.tone === "danger" && row.count ? "text-danger" : ""}`}><RollingDigits value={row.count} /> ↗</span>
      </Link>}
  </li>)}</ul>;
}

function Content({ data, flash }: { data: WidgetData; flash: boolean }) {
  switch (data.kind) {
    case "sales": return <Sales value={data.value} />;
    case "orders": case "action": case "inventory": return <Counts rows={data.value} />;
    case "health": return <ul className="divide-y divide-hairline">{data.value.map((row) => <li key={row.label} className="flex items-center justify-between gap-2 py-3 text-small">
      <span>{row.label}</span><span className="font-mono tabular">{row.rate === null ? "—" : `${row.rate.toFixed(2)}%`}</span>
      <span className={`rounded-pill px-2 py-1 text-eyebrow ${row.rate === null ? "bg-hairline/40 text-mist" : row.rate < row.threshold ? "bg-success/15 text-success" : row.rate < row.threshold * 2 ? "bg-warning/15 text-warning" : "bg-danger/15 text-danger"}`}>
        {row.rate === null ? "Pending data" : row.rate < row.threshold ? "Good" : row.rate < row.threshold * 2 ? "At risk" : "Poor"}
      </span>
    </li>)}</ul>;
    case "payments": return <div className="space-y-3 text-small"><p className="flex justify-between"><span>Last settlement</span><span className="text-mist">{data.value.lastSettlement ?? "Not connected"}</span></p>
      <p className="flex justify-between"><span>Next expected</span><span className="text-mist">{data.value.nextExpected ?? "Not connected"}</span></p>
      <p className="flex justify-between border-t border-hairline pt-3"><span>Balance pending</span><span className="font-mono">{data.value.pendingPaise === null ? "Not available" : formatINR(data.value.pendingPaise)}</span></p></div>;
    case "products": return data.value.length ? <ol className="divide-y divide-hairline">{data.value.map((row, index) => <li key={row.id} className="flex items-center gap-3 py-2 text-small">
      <span className="font-mono text-eyebrow text-mist">{String(index + 1).padStart(2, "0")}</span>
      {row.image ? <img className="h-11 w-11 bg-hairline/30 object-cover" src={row.image} alt="" /> : null}
      <span className="min-w-0 flex-1 truncate">{row.name}</span><span className="font-mono tabular">{row.units} units</span><span className="font-mono tabular">{formatINR(row.revenuePaise)}</span>
    </li>)}</ol> : <Empty label="No product sales in the last 30 days." />;
    case "notifications": return data.value.length ? <ul className="divide-y divide-hairline">{data.value.map((row, index) =>
      <li key={row.id} className={flash && index === 0 ? "hub-flash" : ""}><Link href={row.href} className="block py-2.5 hover:text-aqua">
        <span className="block truncate text-small">{row.label}</span><span className="font-mono text-eyebrow text-mist">{new Date(row.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
      </Link></li>)}</ul> : <Empty label="No new activity yet." />;
  }
}

function Empty({ label }: { label: string }) { return <p className="py-5 text-small text-mist">{label}</p>; }

export function WidgetCard({ id, initial }: { id: WidgetId; initial: WidgetData | null }) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState(!initial);
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState(false);
  const lastId = useRef(initial?.kind === "notifications" ? initial.value[0]?.id : undefined);
  useEffect(() => {
    if (!initial) return;
    if (initial.kind === "notifications" && lastId.current && initial.value[0]?.id !== lastId.current) {
      setFlash(true);
      const timer = window.setTimeout(() => setFlash(false), 1500);
      lastId.current = initial.value[0]?.id;
      return () => window.clearTimeout(timer);
    }
    if (initial.kind === "notifications") lastId.current = initial.value[0]?.id;
    setData(initial);
    setError(false);
  }, [initial]);
  function refresh() {
    startTransition(async () => {
      const result = await refreshWidget(id);
      if (result.ok) { setData(result.data); setError(false); }
      else setError(true);
    });
  }
  return <section className={`hub-card hub-card-${id}`} aria-label={widgetTitles[id]}>
    <div className="mb-5 flex items-start justify-between gap-2">
      <div><h2 className="font-display text-h3">{widgetTitles[id]}</h2><p className="mt-1 font-mono text-eyebrow uppercase text-mist">{data ? <TimeLabel at={data.updatedAt} /> : "Unavailable"}</p></div>
      <div className="flex items-center gap-3 text-eyebrow uppercase tracking-wide">
        <button aria-label={`Refresh ${widgetTitles[id]}`} disabled={pending} onClick={refresh} className="text-mist hover:text-aqua disabled:opacity-50">{pending ? "Updating…" : "↻ Refresh"}</button>
        {viewLinks[id] !== "/seller" && <Link href={viewLinks[id]} className="whitespace-nowrap text-aqua hover:underline">View all ↗</Link>}
      </div>
    </div>
    {error && <p role="alert" className="mb-3 text-small text-danger">Could not load the latest data. <button onClick={refresh} className="underline">Retry</button></p>}
    {data ? <Content data={data} flash={flash} /> : <Empty label="Data temporarily unavailable." />}
  </section>;
}
