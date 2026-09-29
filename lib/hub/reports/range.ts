/**
 * Report date ranges in IST. Presets: today, 7d, 30d, this month, last
 * month, custom — each with an equal-length comparison window before it.
 */

import { istDayAdd, istDayOf, istDaysBetween, istDayWindow } from "@/lib/time/ist";

export type RangePreset = "today" | "7d" | "30d" | "this-month" | "last-month" | "custom";

export type DateRange = {
  preset: RangePreset;
  /** Inclusive IST calendar days. */
  fromDay: string;
  toDay: string;
};

export function resolveRange(
  preset: RangePreset,
  custom: { fromDay?: string; toDay?: string } = {},
  now: Date = new Date(),
): DateRange {
  const today = istDayOf(now.toISOString());
  switch (preset) {
    case "today":
      return { preset, fromDay: today, toDay: today };
    case "7d":
      return { preset, fromDay: istDayAdd(today, -6), toDay: today };
    case "30d":
      return { preset, fromDay: istDayAdd(today, -29), toDay: today };
    case "this-month":
      return { preset, fromDay: `${today.slice(0, 7)}-01`, toDay: today };
    case "last-month": {
      const firstOfThis = `${today.slice(0, 7)}-01`;
      const lastOfPrev = istDayAdd(firstOfThis, -1);
      return { preset, fromDay: `${lastOfPrev.slice(0, 7)}-01`, toDay: lastOfPrev };
    }
    case "custom": {
      const fromDay = custom.fromDay && /^\d{4}-\d{2}-\d{2}$/.test(custom.fromDay) ? custom.fromDay : istDayAdd(today, -6);
      const toDay = custom.toDay && /^\d{4}-\d{2}-\d{2}$/.test(custom.toDay) ? custom.toDay : today;
      return fromDay <= toDay ? { preset, fromDay, toDay } : { preset, fromDay: toDay, toDay: fromDay };
    }
    default:
      return { preset: "7d", fromDay: istDayAdd(today, -6), toDay: today };
  }
}

/** The equal-length window immediately before the range. */
export function previousRange(range: DateRange): DateRange {
  const days = istDaysBetween(range.fromDay, range.toDay).length;
  const toDay = istDayAdd(range.fromDay, -1);
  return { preset: range.preset, fromDay: istDayAdd(toDay, -(days - 1)), toDay };
}

export function rangeDays(range: DateRange): string[] {
  return istDaysBetween(range.fromDay, range.toDay);
}

export function rangeWindow(range: DateRange): { fromIso: string; toIso: string } {
  return istDayWindow(range.fromDay, range.toDay);
}

export function inRange(iso: string, range: DateRange): boolean {
  const day = istDayOf(iso);
  return day >= range.fromDay && day <= range.toDay;
}

export function labelFor(range: DateRange): string {
  const format = (day: string) =>
    new Date(`${day}T00:00:00.000Z`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  return range.fromDay === range.toDay
    ? format(range.fromDay)
    : `${format(range.fromDay)} – ${format(range.toDay)}`;
}

export { istDayOf };
