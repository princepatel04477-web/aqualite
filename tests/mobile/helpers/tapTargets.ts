import type { Page } from "@playwright/test";

export interface TapTarget {
  selector: string;
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
}

export interface TapTargetIssue {
  selector: string;
  width: number;
  height: number;
  reason: "too-small" | "too-close";
  near?: string;
}

const SELECTOR = "a, button, input, select, textarea, summary, [role='button']";

/**
 * Check b: tap targets.
 * Every interactive control must render at >= 44x44 CSS px, and its
 * centre must sit at least 8px clear of any neighbouring target's box.
 */
export async function findTapTargetIssues(
  page: Page,
): Promise<TapTargetIssue[]> {
  const boxes = await page.evaluate((sel: string): TapTarget[] => {
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
    const list: TapTarget[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      list.push({
        selector: describe(el),
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        cx: rect.x + rect.width / 2,
        cy: rect.y + rect.height / 2,
      });
    }
    return list;
  }, SELECTOR);

  const issues: TapTargetIssue[] = [];

  for (const b of boxes) {
    if (b.width < 44 || b.height < 44) {
      issues.push({
        selector: b.selector,
        width: Math.round(b.width),
        height: Math.round(b.height),
        reason: "too-small",
      });
    }
  }

  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i];
    if (!a) continue;
    for (let j = 0; j < boxes.length; j++) {
      if (i === j) continue;
      const b = boxes[j];
      if (!b) continue;
      const nx = Math.max(b.x, Math.min(a.cx, b.x + b.width));
      const ny = Math.max(b.y, Math.min(a.cy, b.y + b.height));
      const dist = Math.hypot(a.cx - nx, a.cy - ny);
      if (dist < 8) {
        issues.push({
          selector: a.selector,
          width: Math.round(a.width),
          height: Math.round(a.height),
          reason: "too-close",
          near: b.selector,
        });
        break;
      }
    }
  }

  return issues;
}
