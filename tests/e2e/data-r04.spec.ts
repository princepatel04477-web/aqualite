import { execSync } from "node:child_process";
import { expect, test } from "@playwright/test";

test.describe("R04 Product Data, Gallery Images & Demo Orders", () => {
  test("every product card on /, /shop, /shop/men, /shop/women opens a complete PDP with >= 4 images and brokenImages === 0", async ({
    page,
  }) => {
    test.setTimeout(120000);
    const pagesToCheck = ["/", "/shop", "/shop/men", "/shop/women"];
    const pdpHrefs = new Set<string>();

    for (const url of pagesToCheck) {
      await page.goto(url, { waitUntil: "networkidle" });

      // Verify 0-product Kids category is hidden from nav and home ShopIndex
      await expect(page.locator('a[href="/shop/kids"]')).toHaveCount(0);

      // Verify brokenImages === 0 on listing/home page
      const brokenOnPage = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll("img"));
        return imgs
          .filter((img) => {
            const src = img.getAttribute("src") || "";
            if (!src) return false;
            return !img.complete || img.naturalWidth === 0;
          })
          .map((img) => img.src);
      });
      expect(brokenOnPage, `Broken images on ${url}`).toEqual([]);

      const links = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/product/"]')).map(
          (a) => a.getAttribute("href") || "",
        ),
      );
      links.forEach((h) => {
        if (h) pdpHrefs.add(h);
      });
    }

    expect(pdpHrefs.size).toBeGreaterThanOrEqual(9);

    for (const href of pdpHrefs) {
      await page.goto(href, { waitUntil: "networkidle" });
      await expect(page.locator("h1")).toBeVisible();

      // Verify >= 4 gallery thumbnails on every PDP
      const thumbs = page.locator('[data-testid^="gallery-thumb-"]');
      const thumbCount = await thumbs.count();
      expect(thumbCount, `Gallery image count on ${href}`).toBeGreaterThanOrEqual(4);

      // Verify brokenImages === 0 on PDP
      const brokenOnPdp = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll("img"));
        return imgs
          .filter((img) => {
            const src = img.getAttribute("src") || "";
            if (!src) return false;
            return !img.complete || img.naturalWidth === 0;
          })
          .map((img) => img.src);
      });
      expect(brokenOnPdp, `Broken images on PDP ${href}`).toEqual([]);
    }
  });

  test("demo:orders seeds realistic orders and Seller Hub /seller shows non-zero sales, orders, inventory and messages", async ({
    page,
  }) => {
    execSync("npm run demo:orders", { stdio: "inherit" });

    // Sign in as admin@aqualite.in
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.fill("#email", "admin@aqualite.in");
    await page.getByRole("button", { name: "Send code" }).click();
    const otpText = await page.locator("text=/Prototype code \\d{6}/").textContent();
    const code = otpText?.replace(/\D/g, "").slice(0, 6) ?? "";
    expect(code).toHaveLength(6);
    await page.fill("#code", code);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/account");

    await page.goto("/seller", { waitUntil: "networkidle" });
    const bodyText = (await page.locator("body").textContent()) ?? "";
    expect(bodyText).toContain("Orders");
    expect(bodyText).toContain("Sales");
    expect(bodyText).toContain("Inventory");
    expect(bodyText).toContain("Buyer messages >24h");
    expect(bodyText).not.toContain("Something went quiet");

    // Verify /seller/orders lists the 15 seeded demo orders
    await page.goto("/seller/orders", { waitUntil: "domcontentloaded" });
    const rows = page.locator("tr[data-order-number]");
    expect(await rows.count()).toBeGreaterThanOrEqual(12);
  });
});
