import type { Page } from "@playwright/test";

export interface FontSizeIssue {
  selector: string;
  fontSize: number;
  kind: "text" | "input";
}

/**
 * Check c: legibility.
 * Body copy < 12px is flagged; inputs/selects/textareas < 16px are
 * flagged separately because they trigger iOS zoom-on-focus.
 */
export async function findSmallFonts(page: Page): Promise<FontSizeIssue[]> {
  const issues = await page.evaluate((): FontSizeIssue[] => {
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
    const out: FontSizeIssue[] = [];
    const seen = new Set<string>();
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
      const cs = getComputedStyle(el);
      const fs = parseFloat(cs.fontSize);
      if (Number.isNaN(fs)) continue;
      const tag = el.tagName.toLowerCase();
      const isField = tag === "input" || tag === "select" || tag === "textarea";
      const hasText = (el.textContent ?? "").trim().length > 0;
      if (isField) {
        if (fs < 16) {
          const key = describe(el);
          if (!seen.has(key)) {
            seen.add(key);
            out.push({
              selector: key,
              fontSize: Math.round(fs * 100) / 100,
              kind: "input",
            });
          }
        }
      } else if (hasText && fs < 12) {
        const key = describe(el);
        if (!seen.has(key)) {
          seen.add(key);
          out.push({
            selector: key,
            fontSize: Math.round(fs * 100) / 100,
            kind: "text",
          });
        }
      }
    }
    return out;
  });
  return issues;
}
