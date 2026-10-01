import Link from "next/link";

import { RANGE_PRESETS, dayLabel } from "@/lib/hub/reports/view";
import type { DateRange } from "@/lib/hub/reports/range";

/**
 * IST range picker — preset links plus a GET form for a custom day range.
 * Pure navigation: every report page reads the same query contract.
 */
export function RangePicker({
  basePath,
  range,
  extraQuery = "",
}: {
  basePath: string;
  range: DateRange;
  extraQuery?: string;
}) {
  const suffix = extraQuery ? `&${extraQuery}` : "";
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-wrap gap-1">
        {RANGE_PRESETS.map((preset) => {
          const active = preset.id === range.preset || (range.preset === "custom" && preset.id === "custom");
          return (
            <Link
              key={preset.id}
              href={`${basePath}?preset=${preset.id}${suffix}`}
              className={`rounded-pill px-3 py-1.5 font-mono text-hub-label uppercase transition-colors duration-quick ${
                active
                  ? "bg-red text-on-red"
                  : "border border-rule bg-paper text-muted hover:bg-linen hover:text-ink"
              }`}
            >
              {preset.label}
            </Link>
          );
        })}
      </div>
      <form
        action={basePath}
        method="get"
        className="flex items-end gap-2 font-mono text-hub-label uppercase text-muted"
      >
        <input type="hidden" name="preset" value="custom" />
        {extraQuery.split("&").filter(Boolean).map((pair) => {
          const [key, value] = pair.split("=");
          return key && value ? <input key={key} type="hidden" name={key} value={value} /> : null;
        })}
        <label className="flex flex-col gap-1">
          <span>From</span>
          <input
            type="date"
            name="from"
            defaultValue={range.fromDay}
            className="h-8 rounded-control border border-rule bg-paper px-2 font-mono text-hub-id normal-case text-ink"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>To</span>
          <input
            type="date"
            name="to"
            defaultValue={range.toDay}
            className="h-8 rounded-control border border-rule bg-paper px-2 font-mono text-hub-id normal-case text-ink"
          />
        </label>
        <button
          type="submit"
          className="h-8 rounded-control border border-rule bg-paper px-3 text-hub-label normal-case transition-colors duration-quick hover:bg-linen"
        >
          Apply
        </button>
        <span className="ml-2 normal-case text-ink">{dayLabel(range.fromDay)} → {dayLabel(range.toDay)}</span>
      </form>
    </div>
  );
}
