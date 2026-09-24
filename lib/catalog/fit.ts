/**
 * Maps a review's raw `fit` enum to a human label.
 * Returns null when there is no fit value (so callers can omit it).
 */
export type FitValue = "runs_small" | "true" | "runs_large" | null | undefined;

export function fitLabel(fit: FitValue): string | null {
  if (fit === "runs_small") return "Runs small";
  if (fit === "runs_large") return "Runs large";
  if (fit === "true") return "True to size";
  return null;
}
