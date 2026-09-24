import { describe, expect, it } from "vitest";

import { firstSentence } from "@/lib/content/copy";
import { homeCopy } from "@/content/site";
import { visibleIndexRows } from "@/lib/content/visibility";
import type { IndexRow } from "@/components/home/ShopIndex";

describe("firstSentence (M06 mobile hero lead)", () => {
  it("keeps only the first sentence of the marketing lead", () => {
    expect(firstSentence(homeCopy.lead)).toBe(
      "A cushioned EVA sole, a quiet strap, and a grip that stays honest in the rain.",
    );
  });

  it("trims multi-sentence copy at the first full stop", () => {
    expect(firstSentence("One two three. Four five.")).toBe("One two three.");
  });

  it("handles question and exclamation ends", () => {
    expect(firstSentence("Feels like water? Buy it.")).toBe(
      "Feels like water?",
    );
    expect(firstSentence("Run don't walk! Then rest.")).toBe("Run don't walk!");
  });

  it("returns the trimmed copy when there is no sentence end", () => {
    expect(firstSentence("  Just landed  ")).toBe("Just landed");
  });

  it("never returns an empty string for non-empty input", () => {
    expect(firstSentence(homeCopy.lead).length).toBeGreaterThan(0);
    expect(firstSentence(homeCopy.lead).length).toBeLessThan(
      homeCopy.lead.length,
    );
  });
});

describe("shop-by tiles (M06 mobile grid)", () => {
  const men: IndexRow = {
    href: "/shop/men",
    label: "Men",
    count: 6,
    note: "",
    image: "/catalog/tide-slide-midnight.jpg",
  };
  const women: IndexRow = {
    href: "/shop/women",
    label: "Women",
    count: 4,
    note: "",
    image: "/catalog/pearl-slide-blush.jpg",
  };
  const kids: IndexRow = {
    href: "/shop/kids",
    label: "Kids",
    count: 0,
    note: "",
    image: null,
  };
  const rows: IndexRow[] = [men, kids, women];

  it("hides empty categories without keepWhenEmpty", () => {
    const visible = visibleIndexRows(rows);
    expect(visible.map((row) => row.label)).toEqual(["Men", "Women"]);
  });

  it("keeps a keepWhenEmpty row so the Coming soon tile renders", () => {
    const visible = visibleIndexRows([
      { ...kids, keepWhenEmpty: true },
      men,
      women,
    ]);
    expect(visible.map((row) => row.label)).toContain("Kids");
  });
});
