import { expect, type Page, test } from "@playwright/test";

/**
 * M07 — listing pages + product card acceptance checks.
 * Runs on the four-device matrix from playwright.config.ts against
 * BASE_URL. The demo catalog is ~24 pairs (one page at PAGE_SIZE 24),
 * so the multi-page checks branch: with a single page they assert the
 * graceful path (no load-more control, scroll restore still on); with a
 * fuller catalog (admin-added products) they drive real auto-loading.
 */

const SMALL = { width: 390, height: 844 };
const PAGE_SIZE = 24;

async function visit(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: "load" });
}

function gridTiles(page: Page) {
  return page.locator("#content article");
}

async function totalCount(page: Page): Promise<number> {
  const label =
    (await page.locator("p[aria-live='polite']").first().textContent()) ?? "0";
  return Number(label.replace(/\D+/g, "")) || 0;
}

async function autoLoad(page: Page, rounds: number): Promise<void> {
  for (let round = 0; round < rounds; round += 1) {
    await page.mouse.wheel(0, 20000);
    await page.waitForTimeout(400);
  }
}

test.describe("M07 · quick add", () => {
  test("tap + → size sheet → add works by touch only", async ({ page }) => {
    await page.setViewportSize(SMALL);
    await visit(page, "/shop/men");

    const plus = page.locator("button[aria-label^='Add']").first();
    await plus.scrollIntoViewIfNeeded();
    await plus.click();

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.locator("img").first()).toBeVisible(); // product thumb
    await expect(sheet.getByText("Add to bag")).toBeDisabled();

    const pill = sheet
      .getByRole("button", { name: /^UK \d+(\.\d+)?$/ })
      .first();
    await pill.click();
    await expect(sheet.getByText("Add to bag")).toBeEnabled();
    await sheet.getByText("Add to bag").click();

    await expect(sheet).toBeHidden();
    await expect(page.getByText("Added to bag")).toBeVisible();
  });
});

test.describe("M07 · filter + sort sheets", () => {
  test("filter sheet applies, updates the count and shares a URL", async ({
    page,
  }) => {
    await page.setViewportSize(SMALL);
    await visit(page, "/shop");

    await page
      .getByRole("button", { name: /^Filter/ })
      .first()
      .click();
    const sheet = page.getByRole("dialog", { name: "Filter" });
    await expect(sheet).toBeVisible();

    // Pick an in-stock size (its aria-label carries the facet count).
    const pill = sheet
      .getByRole("button", { name: /^UK \d+(\.\d+)?, [1-9]/ })
      .first();
    await pill.click();

    const apply = sheet.getByRole("button", { name: /Show \d+ pairs?/ });
    const label = (await apply.textContent()) ?? "";
    const wanted = Number(label.replace(/\D+/g, ""));
    expect(wanted).toBeGreaterThanOrEqual(1);
    await apply.click();

    await expect(sheet).toBeHidden();
    expect(page.url()).toContain("sizes=");
    await expect(page.locator("p[aria-live='polite']").first()).toHaveText(
      new RegExp(`^${wanted} pairs?$`),
    );
  });

  test("sort sheet applies a sort and the URL carries it", async ({ page }) => {
    await page.setViewportSize(SMALL);
    await visit(page, "/shop");

    await page.getByRole("button", { name: /^Sort/ }).first().click();
    const sheet = page.getByRole("dialog", { name: "Sort" });
    await sheet.getByRole("radio", { name: "Price, low to high" }).click();

    await expect(sheet).toBeHidden();
    expect(page.url()).toContain("sort=price-asc");
  });
});

test.describe("M07 · infinite loading + back restore", () => {
  test("back from a PDP restores the grid and scroll position", async ({
    page,
  }) => {
    await page.setViewportSize(SMALL);
    await visit(page, "/shop");
    const total = await totalCount(page);

    const tiles = gridTiles(page);
    const initial = await tiles.count();
    if (total > PAGE_SIZE) {
      await autoLoad(page, 3);
    }
    const loaded = await tiles.count();
    if (total > PAGE_SIZE) {
      expect(loaded).toBeGreaterThan(initial);
    } else {
      expect(loaded).toBe(total);
    }

    // Walk deep into the grid so the restore has a real offset to find.
    await page.evaluate(() =>
      window.scrollTo(0, document.body.scrollHeight / 2),
    );
    await page.waitForTimeout(300);
    const beforeY = await page.evaluate(() => window.scrollY);
    expect(beforeY).toBeGreaterThan(100);

    await tiles.first().click();
    await page.waitForURL(/\/product\//);
    await page.goBack();

    await expect(tiles.first()).toBeVisible();
    await expect.poll(async () => tiles.count()).toBeGreaterThanOrEqual(loaded);
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(100);
  });

  test("CLS stays under 0.02 while auto-loading pages", async ({ page }) => {
    await page.setViewportSize(SMALL);
    await visit(page, "/shop");
    const total = await totalCount(page);

    await page.evaluate(() => {
      const shifts: number[] = [];
      (window as unknown as { __aqCls: number[] }).__aqCls = shifts;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shifted = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value: number;
          };
          if (!shifted.hadRecentInput) shifts.push(shifted.value);
        }
      }).observe({
        type: "layout-shift",
        buffered: true,
      } as PerformanceObserverInit);
    });

    const tiles = gridTiles(page);
    if (total > PAGE_SIZE) {
      await autoLoad(page, 3);
      expect(await tiles.count()).toBeGreaterThan(PAGE_SIZE);
    } else {
      await autoLoad(page, 1);
    }

    const shifts = await page.evaluate(
      () => (window as unknown as { __aqCls: number[] }).__aqCls,
    );
    const clsTotal = shifts.reduce((sum, value) => sum + value, 0);
    expect(clsTotal).toBeLessThan(0.02);
  });
});

test.describe("M07 · card hygiene", () => {
  test("no hover-only UI and no page overflow at 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await visit(page, "/shop/men");

    // The sheen overlay is hover-only decoration — absent on touch.
    await expect(page.locator(".card-sheen").first()).toBeHidden();
    // Quick add is always visible (no hover-to-reveal).
    await expect(
      page.locator("button[aria-label^='Add']").first(),
    ).toBeVisible();

    const overflow = await page.evaluate(() => {
      const el = document.scrollingElement;
      return el ? el.scrollWidth - el.clientWidth : 0;
    });
    expect(overflow).toBeLessThanOrEqual(0);

    // The porcelain 4:5 stage survives the 360px two-column grid.
    const stage = page.locator("#content article .stage").first();
    const box = await stage.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(120);
  });
});
