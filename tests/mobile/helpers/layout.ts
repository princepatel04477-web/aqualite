import type { Page } from "@playwright/test";

export interface BottomOverlapIssue {
  selectors: string[];
  bottom: number;
}

export interface ViewportJumpIssue {
  selector: string;
  before: number;
  after: number;
}

const describeEl = (el: Element): string => {
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

/**
 * Check g: fixed/sticky elements overlapping near the bottom edge.
 * e.g. a sticky buy bar colliding with a toast or cookie banner.
 */
export async function findBottomOverlaps(
  page: Page,
): Promise<BottomOverlapIssue[]> {
  return page.evaluate((): BottomOverlapIssue[] => {
    const vh = window.innerHeight;
    const fixed: HTMLElement[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
      const pos = getComputedStyle(el).position;
      const rect = el.getBoundingClientRect();
      if (
        (pos === "fixed" || pos === "sticky") &&
        rect.bottom > vh - 80 &&
        rect.top < vh
      ) {
        fixed.push(el);
      }
    }
    const issues: BottomOverlapIssue[] = [];
    for (let i = 0; i < fixed.length; i++) {
      const a = fixed[i];
      if (!a) continue;
      for (let j = i + 1; j < fixed.length; j++) {
        const b = fixed[j];
        if (!b) continue;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const overlapY = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        const overlapX = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        if (overlapY > 4 && overlapX > 4) {
          issues.push({
            selectors: [describeEl(a), describeEl(b)],
            bottom: Math.round(Math.min(ra.bottom, rb.bottom)),
          });
        }
      }
    }
    return issues;
  });
}

/**
 * Check f: viewport-unit jump when the URL bar collapses.
 * Elements whose height is exactly innerHeight can jump as the mobile
 * URL bar shows/hides. We compare heights before and after a 200px
 * scroll and report any that changed.
 */
export async function findViewportUnitJump(
  page: Page,
): Promise<ViewportJumpIssue[]> {
  return page.evaluate((): Promise<ViewportJumpIssue[]> => {
    const candidates: HTMLElement[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
      if (getComputedStyle(el).height === `${window.innerHeight}px`) {
        candidates.push(el);
      }
    }
    const before = candidates.map((c) => c.getBoundingClientRect().height);
    window.scrollBy(0, 200);
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        const issues: ViewportJumpIssue[] = [];
        candidates.forEach((c, i) => {
          const a = before[i];
          if (a === undefined) return;
          const afterH = c.getBoundingClientRect().height;
          if (Math.abs(afterH - a) > 2) {
            issues.push({
              selector: describeEl(c),
              before: Math.round(a),
              after: Math.round(afterH),
            });
          }
        });
        window.scrollBy(0, -200);
        resolve(issues);
      });
    });
  });
}
