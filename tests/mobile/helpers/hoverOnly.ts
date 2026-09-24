import type { Page } from "@playwright/test";

export interface HoverOnlyIssue {
  selector: string;
  property: string;
}

/**
 * Check d: hover-only affordances (heuristic).
 * On touch there is no hover. We scan the page's stylesheets for rules
 * whose `:hover` selector reveals an element (opacity / visibility /
 * display) and flag the base selector when a matching element is
 * currently hidden. This approximates the CDP :hover-diff without a
 * desktop UA; it is conservative — it lists candidates for review.
 */
export async function findHoverOnlyAffordances(
  page: Page,
): Promise<HoverOnlyIssue[]> {
  return page.evaluate((): HoverOnlyIssue[] => {
    const issues: HoverOnlyIssue[] = [];
    const seen = new Set<string>();

    const scan = (sheet: CSSStyleSheet): void => {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        return; // cross-origin sheet — skip
      }
      for (const rule of Array.from(rules)) {
        if (rule.type !== CSSRule.STYLE_RULE) continue;
        const sr = rule as CSSStyleRule;
        if (!sr.selectorText.includes(":hover")) continue;
        const parts = sr.selectorText.split(":hover");
        const base = parts[0]?.trim();
        if (!base) continue;
        const reveals =
          sr.style.opacity || sr.style.visibility || sr.style.display;
        if (!reveals) continue;
        try {
          for (const el of Array.from(
            document.querySelectorAll<HTMLElement>(base),
          )) {
            const cs = getComputedStyle(el);
            const hidden =
              parseFloat(cs.opacity) < 0.01 ||
              cs.visibility === "hidden" ||
              cs.display === "none";
            const key = `${base}|${reveals}|${cs.opacity}|${cs.visibility}`;
            if (hidden && !seen.has(key)) {
              seen.add(key);
              issues.push({ selector: base, property: reveals });
            }
          }
        } catch {
          // invalid/unresolved selector — ignore
        }
      }
    };

    for (const sheet of Array.from(document.styleSheets)) scan(sheet);
    return issues.slice(0, 40);
  });
}
