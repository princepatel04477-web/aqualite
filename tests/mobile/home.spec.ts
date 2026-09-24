import { expect, type Page, test } from "@playwright/test";

/**
 * M06 — homepage mobile choreography acceptance checks.
 * Runs on the four-device matrix from playwright.config.ts.
 * BASE_URL defaults to the live workers.dev build; point it at a local
 * preview for regression runs.
 */

async function visitHome(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "load" });
  await expect(page.locator("[data-hero='mobile'] h1")).toBeVisible();
}

test.describe("M06 · home", () => {
  test("hero headline, shoe and both CTAs fit the first viewport (375×667)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await visitHome(page);

    const hero = page.locator("[data-hero='mobile']");
    const targets = [
      hero.locator("h1"),
      hero.locator("img"),
      hero.getByRole("link", { name: "Shop men" }),
      hero.getByRole("link", { name: "Shop women" }),
    ];
    for (const target of targets) {
      await expect(target).toBeVisible();
      const box = await target.boundingBox();
      expect(box, "hero element must render").not.toBeNull();
      expect(
        box!.y + box!.height,
        "hero element must sit inside the first viewport",
      ).toBeLessThanOrEqual(668);
    }
  });

  test("no ScrollTrigger instances exist on mobile", async ({ page }) => {
    await visitHome(page);
    const count = await page.evaluate(
      () => window.__aqScrollTriggerCount?.() ?? -1,
    );
    expect(count).toBe(0);
  });

  test("page has no horizontal overflow", async ({ page }) => {
    await visitHome(page);
    const overflow = await page.evaluate(() => {
      const el = document.scrollingElement;
      return el ? el.scrollWidth - el.clientWidth : 0;
    });
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("velocity band renders one row and pauses while offscreen", async ({
    page,
  }) => {
    await visitHome(page);
    const band = page.locator("section:has(.marquee-track)");
    await expect(band).toBeVisible();
    // The second (mono) row is desktop-only.
    await expect(page.locator(".marquee-track.reverse")).toBeHidden();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(band).toHaveAttribute("data-paused", "true", {
      timeout: 5_000,
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(band).not.toHaveAttribute("data-paused");
  });

  test("new-arrivals rail is a snap scroller and its progress line tracks", async ({
    page,
  }) => {
    await visitHome(page);
    const rail = page.locator(".rail").first();
    await expect(rail).toBeVisible();
    expect(
      await rail.evaluate((el) => getComputedStyle(el).scrollSnapType),
    ).not.toBe("none");

    const bar = page.locator("[data-rail-progress]");
    await rail.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
    await page.waitForTimeout(300);
    const scaleX = await bar.evaluate(
      (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a,
    );
    expect(scaleX).toBeGreaterThan(0.5);
  });

  test("shop-by tile grid links through and footer accordions toggle", async ({
    page,
  }) => {
    await visitHome(page);
    // Tile grid: the Men tile carries a serif label and a mono count.
    const tile = page
      .locator("[href='/shop/men']")
      .filter({ hasText: "Men" })
      .first();
    await expect(tile).toBeVisible();
    await expect(tile).toContainText("pairs");

    const trigger = page.getByRole("button", { name: "Help", exact: true });
    await trigger.scrollIntoViewIfNeeded();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("link", { name: "Track order" })).toBeVisible();
  });

  test("construction deck announces the active layer", async ({ page }) => {
    await visitHome(page);
    const live = page
      .locator("[aria-live='polite']")
      .filter({ hasText: "Layer 1 of 4" });
    await expect(live).toHaveText("Layer 1 of 4");
    const card = page.locator("article").filter({ hasText: "Midsole" });
    await card.scrollIntoViewIfNeeded();
  });
});
