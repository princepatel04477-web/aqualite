import {
  previousRange,
  resolveRange,
  type DateRange,
  type RangePreset,
} from "@/lib/hub/reports/range";

const PRESETS: RangePreset[] = ["today", "7d", "30d", "this-month", "last-month", "custom"];

type Params = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Shared by every report page and CSV route: ?preset=7d&from=…&to=… (IST days). */
export function rangeFromParams(params: Params): DateRange {
  const presetRaw = one(params.preset);
  const preset = PRESETS.find((value) => value === presetRaw) ?? "30d";
  return resolveRange(preset, { fromDay: one(params.from), toDay: one(params.to) });
}

export function rangeLabel(range: DateRange): string {
  const format = (day: string): string =>
    new Date(`${day}T00:00:00.000Z`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  return `${format(range.fromDay)} – ${format(range.toDay)} (IST)`;
}

export function dayLabel(day: string): string {
  return new Date(`${day}T00:00:00.000Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

export function csvFilename(prefix: string, range: DateRange): string {
  return `${prefix}_${range.fromDay}_${range.toDay}.csv`;
}

export function compareOf(range: DateRange): DateRange {
  return previousRange(range);
}

export const RANGE_PRESETS: { id: RangePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "custom", label: "Custom" },
];

/** Hours a customer's last incoming message has been waiting for a reply. */
export function waitingHours(
  lastIn: string | null,
  lastOut: string | null,
  now: Date = new Date(),
): number | null {
  if (!lastIn) return null;
  if (lastOut && lastOut >= lastIn) return null;
  return (now.getTime() - new Date(lastIn).getTime()) / 3600000;
}
