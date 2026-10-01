import type { ReactNode } from "react";

/**
 * Chart + always-rendered table. The chart is the visual layer; the table is
 * the accessible source of truth and stays visible next to it.
 */
export function ChartBlock({
  title,
  note,
  chart,
  table,
}: {
  title: string;
  note?: string;
  chart: ReactNode;
  table: ReactNode;
}) {
  return (
    <section className="mt-6 rounded-hub border border-hairline bg-paper p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-hub-section font-semibold">{title}</h2>
        {note ? <p className="text-hub-label text-muted">{note}</p> : null}
      </div>
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="min-w-0">{chart}</div>
        <div className="min-w-0 overflow-x-auto">{table}</div>
      </div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent = "ink",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "ink" | "red" | "aqua" | "success" | "danger";
}) {
  const tone =
    accent === "red"
      ? "text-red-ink"
      : accent === "aqua"
        ? "text-aqua-deep"
        : accent === "success"
          ? "text-success"
          : accent === "danger"
            ? "text-danger"
            : "text-ink";
  return (
    <div className="rounded-hub border border-hairline bg-paper p-4">
      <p className="font-mono text-hub-label uppercase text-muted">{label}</p>
      <p className={`mt-1 text-hub-kpi font-display tabular ${tone}`}>{value}</p>
      {sub ? <p className="mt-1 text-hub-label text-muted">{sub}</p> : null}
    </div>
  );
}
