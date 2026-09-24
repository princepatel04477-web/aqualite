import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { OverflowIssue } from "./overflow";
import type { TapTargetIssue } from "./tapTargets";
import type { FontSizeIssue } from "./fontSizes";
import type { HoverOnlyIssue } from "./hoverOnly";
import type { LayoutShiftEntry, LongTask } from "./cls";
import type { BottomOverlapIssue, ViewportJumpIssue } from "./layout";

export interface RouteResult {
  device: string;
  route: string;
  url: string;
  overflow: OverflowIssue[];
  tapTargets: TapTargetIssue[];
  fonts: FontSizeIssue[];
  hoverOnly: HoverOnlyIssue[];
  layoutShifts: LayoutShiftEntry[];
  longTasks: LongTask[];
  bottomOverlaps: BottomOverlapIssue[];
  viewportJumps: ViewportJumpIssue[];
}

const RESULTS_DIR = join(process.cwd(), "docs", "mobile", "results");
const SCREENS_DIR = join(process.cwd(), "docs", "mobile", "screens");

export function resultPath(device: string, route: string): string {
  return join(RESULTS_DIR, device, `${route}.json`);
}

export function screenPath(
  device: string,
  route: string,
  kind: "full" | "viewport",
): string {
  return join(SCREENS_DIR, device, `${route}-${kind}.png`);
}

export function ensureScreenDir(device: string): void {
  mkdirSync(join(SCREENS_DIR, device), { recursive: true });
}

export function writeResult(result: RouteResult): void {
  mkdirSync(join(RESULTS_DIR, result.device), { recursive: true });
  writeFileSync(resultPath(result.device, result.route), JSON.stringify(result, null, 2));
}
