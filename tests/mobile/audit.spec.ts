import { test, expect, type Page } from "@playwright/test";

import { ROUTES, BASE_URL, type RouteDef } from "./devices";
import { findHorizontalOverflow } from "./helpers/overflow";
import { findTapTargetIssues } from "./helpers/tapTargets";
import { findSmallFonts } from "./helpers/fontSizes";
import { findHoverOnlyAffordances } from "./helpers/hoverOnly";
import { observeLayoutShifts, findLongTasks } from "./helpers/cls";
import { findBottomOverlaps, findViewportUnitJump } from "./helpers/layout";
import {
  writeResult,
  screenPath,
  ensureScreenDir,
  type RouteResult,
} from "./helpers/report";

/**
 * Best-effort: put an item in the bag so /bag and /checkout have
 * something to render. Uses role/text locators so it does not depend on
 * product-page internals (owned by M08). Failures are swallowed — the
 * audit still measures what it can.
 */
async function ensureBagHasItem(page: Page): Promise<void> {
  try {
    await page.goto(`${BASE_URL}/product/tide-slide?color=midnight`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    const size = page.getByRole("radio").first();
    if ((await size.count()) > 0) await size.click();
    const add = page.getByRole("button", { name: /add to bag/i }).first();
    if ((await add.count()) > 0) await add.click();
    await page.waitForTimeout(800);
  } catch {
    // bag/checkout measured without a guaranteed item
  }
}

for (const route of ROUTES as RouteDef[]) {
  test(`${route.name}`, async ({ page }, testInfo) => {
    const device = testInfo.project.name;
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e.message)));

    if (route.requiresBag) await ensureBagHasItem(page);

    const url = route.path.startsWith("http")
      ? route.path
      : `${BASE_URL}${route.path}`;
    await page
      .goto(url, { waitUntil: "networkidle", timeout: 60_000 })
      .catch((e) => errors.push(String(e)));
    await page.waitForTimeout(1500);

    const overflow = await findHorizontalOverflow(page);
    const tapTargets = await findTapTargetIssues(page);
    const fonts = await findSmallFonts(page);
    const hoverOnly = await findHoverOnlyAffordances(page);
    const layoutShifts = await observeLayoutShifts(page, 3000);
    const longTasks = await findLongTasks(page, 5000);
    const bottomOverlaps = await findBottomOverlaps(page);
    const viewportJumps = await findViewportUnitJump(page);

    const result: RouteResult = {
      device,
      route: route.name,
      url,
      overflow,
      tapTargets,
      fonts,
      hoverOnly,
      layoutShifts,
      longTasks,
      bottomOverlaps,
      viewportJumps,
    };
    writeResult(result);

    ensureScreenDir(device);
    await page
      .screenshot({ path: screenPath(device, route.name, "full"), fullPage: true })
      .catch(() => undefined);
    await page
      .screenshot({ path: screenPath(device, route.name, "viewport") })
      .catch(() => undefined);

    // Measurement only: record, do not fail the build here (gate is M10).
    testInfo.annotations.push(
      { type: "overflow", description: String(overflow.length) },
      { type: "tap-targets", description: String(tapTargets.length) },
      { type: "small-fonts", description: String(fonts.length) },
      { type: "hover-only", description: String(hoverOnly.length) },
      { type: "layout-shifts", description: String(layoutShifts.length) },
      { type: "long-tasks", description: String(longTasks.length) },
      { type: "bottom-overlaps", description: String(bottomOverlaps.length) },
      { type: "viewport-jumps", description: String(viewportJumps.length) },
    );
    if (errors.length > 0) {
      testInfo.annotations.push({
        type: "page-errors",
        description: errors.join(" | "),
      });
    }

    expect(errors, `load errors on ${device} ${route.name}`).toHaveLength(0);
  });
}
