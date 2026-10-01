import { expect, test } from "@playwright/test";

test.describe("R02 Purchase Path & Crawl", () => {
  test("crawl internal links and API endpoints without 404/500 errors", async ({ page, request }) => {
    const searchRes = await request.get("/api/search?q=clog");
    expect(searchRes.status()).toBe(200);
    const searchJson = (await searchRes.json()) as { products: unknown[] };
    expect(searchJson.products.length).toBeGreaterThan(0);

    const pinRes = await request.get("/api/pincode/400001");
    expect(pinRes.status()).toBe(200);

    const console404s: string[] = [];
    page.on("response", (res) => {
      if (res.status() >= 400 && !res.url().includes("favicon")) {
        console404s.push(`${res.status()} ${res.url()}`);
      }
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Bag count badge hidden when 0
    const bagBtn = page.locator('button[aria-label="Bag, 0 items"]');
    await expect(bagBtn).toBeVisible();
    await expect(bagBtn).not.toContainText("0");

    const hrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a[href]"))
        .map((a) => a.getAttribute("href") || "")
        .filter((h) => h.startsWith("/") && !h.startsWith("//")),
    );
    const uniqueHrefs = Array.from(new Set(hrefs));
    expect(uniqueHrefs.length).toBeGreaterThan(10);

    for (const href of uniqueHrefs) {
      const res = await request.get(href);
      expect(res.status(), `Broken link ${href}`).toBeLessThan(400);
    }
    expect(console404s).toEqual([]);
  });

  test("sold-out size cannot be added to bag", async ({ page }) => {
    await page.goto("/product/harbour-clog?color=navy", { waitUntil: "domcontentloaded" });
    const soldOutBtn = page.locator('button[aria-label="UK 11, sold out"]');
    await expect(soldOutBtn).toBeVisible();
    await soldOutBtn.click();

    await expect(page.locator("text=UK 11 is sold out.")).toBeVisible();
    await expect(page.locator('button:has-text("Notify me")')).toBeVisible();
  });

  test("full purchase path: Razorpay test mode + double-click protection + Seller Hub shipment confirmation", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Navigate via hero CTA "Shop Harbour" (/product/harbour-clog?color=navy)
    const shopHarbourHref = await page
      .locator('a[href="/product/harbour-clog?color=navy"]')
      .first()
      .getAttribute("href");
    expect(shopHarbourHref).toBe("/product/harbour-clog?color=navy");
    await page.goto(shopHarbourHref!, { waitUntil: "domcontentloaded" });

    await expect(page.locator("h1")).toContainText("Harbour Clog");

    // Select UK size 8 (in stock)
    await page.locator('button[aria-label="UK 8"]').click();
    await page.locator('button:has-text("Add to bag")').first().click();

    // Open /bag
    await page.waitForTimeout(600);
    await page.goto("/bag", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText("Your bag");
    await expect(page.locator("text=Harbour Clog")).toBeVisible();

    // Proceed to /checkout
    await page.locator('a[href="/checkout"]').first().click();
    await page.waitForURL("**/checkout");
    await expect(page.locator("h1")).toContainText("Checkout");

    // Fill contact & address
    await page.fill('input[name="email"]', "customer@aqualite.in");
    await page.fill('input[name="phone"]', "9876543210");
    await page.fill('input[name="name"]', "Aarav Mehta");
    await page.fill('input[name="pincode"]', "400001");
    await page.fill('input[name="line1"]', "14 Marine Drive, Churchgate");
    await page.fill('input[name="city"]', "Mumbai");

    // Double-click Pay now to verify idempotency (creates only one order)
    const payBtn = page.locator('button[type="submit"]:has-text("Pay now")');
    await payBtn.dblclick();

    // Expect Razorpay Test Mode Modal
    const modal = page.getByTestId("razorpay-modal");
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Razorpay · Test Mode");

    // Confirm test payment
    await page.getByTestId("razorpay-confirm-btn").click();

    // Land on confirmation page /order/[number]?t=<token>
    await page.waitForURL("**/order/AQ-*");
    await expect(page.getByTestId("order-status-badge")).toHaveText("PAID");
    const orderNumber = (await page.locator("p.text-aqua").first().textContent())?.trim() ?? "";
    expect(orderNumber).toMatch(/^AQ-/);

    // Sign in as admin@aqualite.in to verify order in Seller Hub (/seller/orders)
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.fill("#email", "admin@aqualite.in");
    await page.getByRole("button", { name: "Send code" }).click();

    // Read demo OTP shown on screen
    const otpText = await page.locator("text=/Prototype code \\d{6}/").textContent();
    const code = otpText?.replace(/\D/g, "").slice(0, 6) ?? "";
    expect(code).toHaveLength(6);
    await page.fill("#code", code);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/account");

    // Open Seller Hub orders
    await page.goto("/seller/orders", { waitUntil: "domcontentloaded" });
    const row = page.locator(`tr[data-order-number="${orderNumber}"]`);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("paid");

    // Confirm shipment
    await row.locator('button:has-text("Confirm shipment")').click();
    await expect(row).toContainText("shipped");
  });

  test("full purchase path: Cash on Delivery (COD) + Seller Hub listing", async ({ page }) => {
    await page.goto("/product/tide-slide?color=sand", { waitUntil: "domcontentloaded" });
    await page.locator('button[aria-label="UK 7"]').click();
    await page.locator('button:has-text("Add to bag")').first().click();

    await page.waitForTimeout(600);
    await page.goto("/checkout", { waitUntil: "domcontentloaded" });

    await page.fill('input[name="email"]', "codbuyer@aqualite.in");
    await page.fill('input[name="phone"]', "9812345678");
    await page.fill('input[name="name"]', "Riya Sharma");
    await page.fill('input[name="pincode"]', "400001");
    await page.fill('input[name="line1"]', "22 Colaba Causeway");
    await page.fill('input[name="city"]', "Mumbai");

    await page.locator('input[type="radio"][value="cod"]').check();
    await page.locator('button[type="submit"]:has-text("Place COD order")').click();

    await page.waitForURL("**/order/AQ-*");
    await expect(page.getByTestId("order-status-badge")).toHaveText("COD CONFIRMED");
    const orderNumber = (await page.locator("p.text-aqua").first().textContent())?.trim() ?? "";

    // Sign in as admin@aqualite.in and verify COD order is listed in Seller Hub
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.fill("#email", "admin@aqualite.in");
    await page.getByRole("button", { name: "Send code" }).click();
    const otpText = await page.locator("text=/Prototype code \\d{6}/").textContent();
    const code = otpText?.replace(/\D/g, "").slice(0, 6) ?? "";
    await page.fill("#code", code);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/account");

    await page.goto("/seller/orders", { waitUntil: "domcontentloaded" });
    const row = page.locator(`tr[data-order-number="${orderNumber}"]`);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("cod confirmed");
  });
});
