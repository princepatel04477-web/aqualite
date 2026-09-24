import { describe, expect, it } from "vitest";

import { excludeOverlap } from "@/lib/commerce/collections";
import { fitLabel } from "@/lib/catalog/fit";
import { visibleIndexRows, visibleStats } from "@/lib/content/visibility";

describe("fitLabel (M02 #6 — reviews fit enum)", () => {
  it("maps the raw enum to a friendly label", () => {
    expect(fitLabel("runs_small")).toBe("Runs small");
    expect(fitLabel("runs_large")).toBe("Runs large");
    expect(fitLabel("true")).toBe("True to size");
  });

  it("returns null when there is no fit value", () => {
    expect(fitLabel(null)).toBeNull();
    expect(fitLabel(undefined)).toBeNull();
  });
});

describe("excludeOverlap (M02 #9 — bestsellers vs new arrivals)", () => {
  const a = { slug: "tide-slide", colorwaySlug: "midnight" };
  const b = { slug: "tide-slide", colorwaySlug: "sand" };
  const c = { slug: "pearl-slide", colorwaySlug: "blush" };

  it("removes any product+colourway already shown in the primary list", () => {
    const primary = [a, b];
    const secondary = [a, b, c];
    expect(excludeOverlap(primary, secondary)).toEqual([c]);
  });

  it("keeps everything when there is no overlap", () => {
    expect(excludeOverlap([a], [b, c])).toEqual([b, c]);
  });
});

describe("visibleStats (M02 #3 — unverified stat band)", () => {
  const stats = [
    { value: 1200000, label: "Pairs", verified: true },
    { value: 180, label: "Cities", verified: false },
  ];

  it("hides unverified stats in production", () => {
    expect(visibleStats(stats, true)).toHaveLength(1);
    expect(visibleStats(stats, true)[0]?.label).toBe("Pairs");
  });

  it("keeps all stats outside production (dev affordance)", () => {
    expect(visibleStats(stats, false)).toHaveLength(2);
  });
});

describe("visibleIndexRows (M02 #5 — zero-product categories)", () => {
  const rows = [
    { href: "/men", label: "Men", count: 12, note: "", image: null },
    { href: "/kids", label: "Kids", count: 0, note: "", image: null },
    { href: "/kids-soon", label: "Kids", count: 0, note: "", image: null, keepWhenEmpty: true },
  ];

  it("drops zero-count rows but keeps keepWhenEmpty ones", () => {
    const visible = visibleIndexRows(rows);
    expect(visible).toHaveLength(2);
    expect(visible.map((row) => row.href)).toEqual(["/men", "/kids-soon"]);
  });
});
