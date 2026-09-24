/**
 * Pure visibility helpers for the marketing chrome. Extracted so the
 * "what shows in production" rules are unit-testable and shared between
 * server and client components.
 */

export interface StatVisibility {
  value: number;
  label: string;
  suffix?: string;
  verified: boolean;
}

/** Hide unverified stats in production; keep the whole band only if something remains. */
export function visibleStats(
  stats: readonly StatVisibility[],
  isProduction: boolean,
): StatVisibility[] {
  if (!isProduction) return [...stats];
  return stats.filter((stat) => stat.verified);
}

export interface IndexRowVisibility {
  href: string;
  label: string;
  count: number;
  note: string;
  image: string | null;
  keepWhenEmpty?: boolean;
}

/**
 * Categories with zero active products are hidden. A row flagged
 * `keepWhenEmpty` is kept (rendered as a non-link "Coming soon" tile)
 * so the design space stays but never advertises "0 pairs".
 */
export function visibleIndexRows(
  rows: readonly IndexRowVisibility[],
): IndexRowVisibility[] {
  return rows.filter((row) => row.count > 0 || row.keepWhenEmpty === true);
}
