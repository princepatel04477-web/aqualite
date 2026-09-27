import { beforeEach, describe, expect, it } from "vitest";

import { resetDemo, getHeroSlideRows, reorderHeroSlides, saveHeroSlide } from "@/lib/store/engine";
import { heroSeed } from "@/content/hero";

const ACTOR = "admin:test";

describe("hero slide store", () => {
  beforeEach(async () => {
    await resetDemo();
  });

  it("seeds the five draft showcase rows in sort order", async () => {
    const rows = await getHeroSlideRows();
    expect(rows.map((row) => row.id)).toEqual(heroSeed.map((seed) => `hs_${seed.key}`));
    expect(rows.map((row) => row.sort)).toEqual([10, 20, 30, 40, 50]);
    expect(rows[0]?.productId).toBe("p_tide_slide");
  });

  it("creates a slide appended after the last sort value", async () => {
    const first = (await getHeroSlideRows())[0];
    expect(first).toBeDefined();
    if (!first) return;
    const created = await saveHeroSlide(
      { ...first, id: "", isActive: false, eyebrow: "Test row" },
      ACTOR,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.data.sort).toBe(60);
    expect(created.data.isActive).toBe(false);
  });

  it("enforces the six-active ceiling", async () => {
    const rows = await getHeroSlideRows();
    expect(rows.length).toBe(5);
    const first = rows[0];
    const second = rows[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!first || !second) return;

    // A sixth active slide is allowed…
    const sixth = await saveHeroSlide({ ...first, id: "", isActive: true }, ACTOR);
    expect(sixth.ok).toBe(true);

    // …but a seventh is blocked.
    const seventh = await saveHeroSlide({ ...second, id: "", isActive: true }, ACTOR);
    expect(seventh.ok).toBe(false);
    if (seventh.ok) return;
    expect(seventh.error.code).toBe("VALIDATION");

    // Deactivating one frees a slot again.
    const freed = await saveHeroSlide({ ...first, isActive: false }, ACTOR);
    expect(freed.ok).toBe(true);
    const retry = await saveHeroSlide({ ...second, id: "", isActive: true }, ACTOR);
    expect(retry.ok).toBe(true);
  });

  it("refuses slides pointing at unknown products or colourways", async () => {
    const first = (await getHeroSlideRows())[0];
    expect(first).toBeDefined();
    if (!first) return;
    const badProduct = await saveHeroSlide({ ...first, id: "", productId: "p_ghost" }, ACTOR);
    expect(badProduct.ok).toBe(false);
    const badColorway = await saveHeroSlide({ ...first, id: "", colorwayId: "cw_ghost" }, ACTOR);
    expect(badColorway.ok).toBe(false);
  });

  it("reorders by explicit id list and rejects incomplete lists", async () => {
    const rows = await getHeroSlideRows();
    const ids = rows.map((row) => row.id);
    const reversed = [...ids].reverse();
    const moved = await reorderHeroSlides(reversed, ACTOR);
    expect(moved.ok).toBe(true);
    const after = await getHeroSlideRows();
    expect(after.map((row) => row.id)).toEqual(reversed);
    expect(after[0]?.sort).toBe(10);

    const short = await reorderHeroSlides(reversed.slice(1), ACTOR);
    expect(short.ok).toBe(false);
    const ghost = await reorderHeroSlides([...reversed.slice(1), "hs_ghost"], ACTOR);
    expect(ghost.ok).toBe(false);
  });
});
