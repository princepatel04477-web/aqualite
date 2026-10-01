/** IST (UTC+05:30, no DST) calendar helpers — the reports' timezone law. */

export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** IST calendar day (yyyy-mm-dd) for an ISO timestamp. */
export function istDayOf(iso: string): string {
  return new Date(new Date(iso).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The instant an IST calendar day starts, as ISO UTC. */
export function istDayStartIso(day: string): string {
  return new Date(new Date(`${day}T00:00:00.000Z`).getTime() - IST_OFFSET_MS).toISOString();
}

/** Half-open ISO window [from, to) covering the given inclusive IST days. */
export function istDayWindow(fromDay: string, toDay: string): { fromIso: string; toIso: string } {
  return {
    fromIso: istDayStartIso(fromDay),
    toIso: istDayStartIso(istDayAdd(toDay, 1)),
  };
}

/** Every IST day from → to inclusive. */
export function istDaysBetween(fromDay: string, toDay: string): string[] {
  const days: string[] = [];
  const start = new Date(`${fromDay}T00:00:00.000Z`).getTime();
  const end = new Date(`${toDay}T00:00:00.000Z`).getTime();
  for (let at = start; at <= end; at += 24 * 60 * 60 * 1000) {
    days.push(new Date(at).toISOString().slice(0, 10));
  }
  return days;
}

export function istDayAdd(day: string, deltaDays: number): string {
  return new Date(new Date(`${day}T00:00:00.000Z`).getTime() + deltaDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}
