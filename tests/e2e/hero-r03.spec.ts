import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

function boxesIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  return a.x < bx2 && ax2 > b.x && a.y < by2 && ay2 > b.y;
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const VIEWPORTS = [
  { label: "1024", width: 1024, height: 900, mobile: false },
  { label: "1280", width: 1280, height: 900, mobile: false },
  { label: "1440", width: 1440, height: 900, mobile: false },
  { label: "1920", width: 1920, height: 1080, mobile: false },
  { label: "390", width: 390, height: 844, mobile: true },
] as const;

test.describe("R03 Hero Section Verification", () => {
  test("all 5 slides at 1024, 1280, 1440, 1920 (desktop) and 390 (mobile): zero overlap, contrast >= 4.5:1, single nav, 100svh rhythm", async ({
    page,
  }) => {
    test.setTimeout(120000);
    const outDir = "/tmp/hero-r03";
    fs.mkdirSync(outDir, { recursive: true });

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/", { waitUntil: "networkidle" });
      await page.waitForTimeout(300);

      // Pause autoplay so we can step deterministically through slides 0..4
      const pauseBtn = page.locator("[data-hero-pause]").first();
      await expect(pauseBtn).toBeVisible();
      const isPaused = await pauseBtn.getAttribute("aria-pressed");
      if (isPaused !== "true") {
        await pauseBtn.click();
      }

      // Defect 4 & 5: No floating side arrows or duplicate pagination labels
      await expect(page.locator('button[aria-label="Previous slide"]')).toHaveCount(0);
      await expect(page.locator('button[aria-label="Next slide"]')).toHaveCount(0);

      // Single thumbnail rail with 5 tabs
      const tabs = page.locator('[data-hero-thumb-rail] [role="tab"]');
      await expect(tabs).toHaveCount(5);

      if (!vp.mobile) {
        // Verify full product names on desktop thumbnails are never truncated
        const truncatedCount = await page.evaluate(() => {
          const names = Array.from(document.querySelectorAll<HTMLElement>("[data-thumb-name]"));
          return names.filter((el) => el.scrollWidth > el.clientWidth + 1).length;
        });
        expect(truncatedCount, `Truncated thumb names at ${vp.label}`).toBe(0);

        // Defect 7: Bottom-right counter / Pause / Scroll share a horizontal baseline
        const counterBox = await page.locator("[data-hero-counter]").boundingBox();
        const pauseBox = await page.locator("[data-hero-pause]").boundingBox();
        const scrollBox = await page.locator("[data-hero-scroll-cue]").boundingBox();
        expect(counterBox).not.toBeNull();
        expect(pauseBox).not.toBeNull();
        expect(scrollBox).not.toBeNull();
        if (counterBox && pauseBox && scrollBox) {
          const cy1 = counterBox.y + counterBox.height / 2;
          const cy2 = pauseBox.y + pauseBox.height / 2;
          const cy3 = scrollBox.y + scrollBox.height / 2;
          expect(Math.abs(cy1 - cy2), `Counter vs Pause baseline at ${vp.label}`).toBeLessThanOrEqual(3);
          expect(Math.abs(cy1 - cy3), `Counter vs Scroll baseline at ${vp.label}`).toBeLessThanOrEqual(3);
          expect(
            scrollBox.x + scrollBox.width,
            `Scroll cue right edge within viewport at ${vp.label}`,
          ).toBeLessThanOrEqual(vp.width - 16);
        }

        // Defect 9: At 1440×900 the full hero fits in one viewport (100svh, min 720px)
        if (vp.width === 1440 && vp.height === 900) {
          const heroBox = await page.locator("[data-hero-root]").boundingBox();
          expect(heroBox).not.toBeNull();
          if (heroBox) {
            expect(heroBox.y + heroBox.height).toBeLessThanOrEqual(901);
          }
        }
      }

      for (let slideIdx = 0; slideIdx < 5; slideIdx += 1) {
        if (slideIdx > 0) {
          await tabs.nth(slideIdx).click();
          await page.waitForTimeout(vp.mobile ? 450 : 1250);
        }

        const contentLoc = vp.mobile
          ? page.locator("[data-hero-content]").first()
          : page.locator(`[data-hero-content="${slideIdx}"]`);
        const shoeImgLoc = vp.mobile
          ? page.locator("[data-hero-shoe] img").first()
          : page.locator(`[data-hero-shoe="${slideIdx}"] img`);

        await expect(contentLoc).toBeVisible();
        await expect(shoeImgLoc).toBeVisible();

        const eyebrowLoc = vp.mobile
          ? page.locator("[data-hero-eyebrow-text]").first()
          : contentLoc.locator("[data-hero-eyebrow-text]");

        // Defect 6: Eyebrow is text only ("Monsoon '26"), no "01 / 06" numbering
        const eyebrowText = (await eyebrowLoc.textContent())?.trim() ?? "";
        expect(eyebrowText.toUpperCase()).toBe("MONSOON '26");
        const fullEyebrow = (await eyebrowLoc.locator("..").textContent())?.trim() ?? "";
        expect(fullEyebrow).not.toContain("/ 06");

        // Automated overlap test: headline, lead, and CTAs never intersect shoe image
        const headlineBox = await contentLoc.locator("[data-hero-headline]").boundingBox();
        const leadBox = await contentLoc.locator("[data-hero-lead]").boundingBox();
        const ctasBox = await contentLoc.locator("[data-hero-ctas]").boundingBox();
        const shoeBox = await shoeImgLoc.boundingBox();

        expect(headlineBox, `headlineBox slide ${slideIdx} @ ${vp.label}`).not.toBeNull();
        expect(leadBox, `leadBox slide ${slideIdx} @ ${vp.label}`).not.toBeNull();
        expect(ctasBox, `ctasBox slide ${slideIdx} @ ${vp.label}`).not.toBeNull();
        expect(shoeBox, `shoeBox slide ${slideIdx} @ ${vp.label}`).not.toBeNull();

        if (headlineBox && leadBox && ctasBox && shoeBox) {
          expect(
            boxesIntersect(headlineBox, shoeBox),
            `Headline overlaps shoe on slide ${slideIdx + 1} at ${vp.label} (${JSON.stringify(headlineBox)} vs ${JSON.stringify(shoeBox)})`,
          ).toBe(false);
          expect(
            boxesIntersect(leadBox, shoeBox),
            `Lead overlaps shoe on slide ${slideIdx + 1} at ${vp.label} (${JSON.stringify(leadBox)} vs ${JSON.stringify(shoeBox)})`,
          ).toBe(false);
          expect(
            boxesIntersect(ctasBox, shoeBox),
            `CTAs overlap shoe on slide ${slideIdx + 1} at ${vp.label} (${JSON.stringify(ctasBox)} vs ${JSON.stringify(shoeBox)})`,
          ).toBe(false);
        }

        // Contrast >= 4.5:1 for lead and eyebrow on every slide
        const colors = await contentLoc.evaluate((node) => {
          const parseRgb = (str: string): [number, number, number] => {
            const m = str.match(/\d+/g)?.map(Number) ?? [27, 23, 20];
            return [m[0] ?? 0, m[1] ?? 0, m[2] ?? 0];
          };
          const eyebrowEl = node.querySelector<HTMLElement>("[data-hero-eyebrow-text]");
          const leadEl = node.querySelector<HTMLElement>("[data-hero-lead]");
          const rootEl = document.querySelector<HTMLElement>("[data-hero-root]");
          return {
            eyebrowFg: parseRgb(eyebrowEl ? getComputedStyle(eyebrowEl).color : "rgb(74, 66, 59)"),
            leadFg: parseRgb(leadEl ? getComputedStyle(leadEl).color : "rgb(74, 66, 59)"),
            bg: parseRgb(rootEl ? getComputedStyle(rootEl).backgroundColor : "rgb(250, 246, 238)"),
          };
        });

        expect(
          contrastRatio(colors.eyebrowFg, colors.bg),
          `Eyebrow contrast on slide ${slideIdx + 1} at ${vp.label}`,
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(colors.leadFg, colors.bg),
          `Lead contrast on slide ${slideIdx + 1} at ${vp.label}`,
        ).toBeGreaterThanOrEqual(4.5);

        if (vp.width === 1440 || vp.width === 390 || slideIdx === 3) {
          await page.screenshot({
            path: path.join(outDir, `slide-${slideIdx + 1}-${vp.label}.png`),
            fullPage: false,
          });
        }
      }
    }
  });
});
