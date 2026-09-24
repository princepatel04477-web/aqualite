import type { Page } from "@playwright/test";

export interface OverflowIssue {
  selector: string;
  right: number;
  width: number;
  innerWidth: number;
}

/**
 * Check a: horizontal overflow.
 * Any element whose right edge exceeds the viewport by > 1px, plus the
 * document scrollWidth. Returns the worst offenders (capped) with the
 * selector and measured widths so the report can point at the offender.
 */
export async function findHorizontalOverflow(
  page: Page,
): Promise<OverflowIssue[]> {
  const vw = page.viewportSize()?.width ?? 0;
  const issues = await page.evaluate((viewportWidth: number): OverflowIssue[] => {
    const describe = (el: Element): string => {
      const tag = el.tagName.toLowerCase();
      let s = tag;
      if (el.id) s += `#${el.id}`;
      if (el instanceof HTMLElement) {
        const cls = el.className;
        if (typeof cls === "string" && cls.trim()) {
          s += "." + cls.trim().split(/\s+/).slice(0, 2).join(".");
        }
      }
      return s;
    };

    const result: OverflowIssue[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.right > viewportWidth + 1) {
        result.push({
          selector: describe(el),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          innerWidth: viewportWidth,
        });
      }
    }
    const scrollW = document.documentElement.scrollWidth;
    if (scrollW > viewportWidth + 1) {
      result.push({
        selector: "html (document.scrollWidth)",
        right: scrollW,
        width: scrollW,
        innerWidth: viewportWidth,
      });
    }
    return result.slice(0, 60);
  }, vw);
  return issues;
}
