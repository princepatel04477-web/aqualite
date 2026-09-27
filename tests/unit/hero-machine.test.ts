import { describe, expect, it } from "vitest";

import {
  HERO_AUTOPLAY_MS,
  HERO_AUTOPLAY_MS_MOBILE,
  HERO_INTERACTION_COOLDOWN_MS,
  createHeroMachine,
  heroDirection,
  wrapIndex,
} from "@/components/home/hero/heroMachine";

function scripted(now: { value: number }) {
  return createHeroMachine({ count: 5, now: () => now.value });
}

describe("heroMachine basics", () => {
  it("starts idle at the first slide", () => {
    const machine = createHeroMachine({ count: 5 });
    expect(machine.getState()).toEqual({ name: "idle", index: 0 });
    expect(machine.activeIndex()).toBe(0);
  });

  it("advances and completes transitions", () => {
    const machine = createHeroMachine({ count: 5 });
    const result = machine.dispatch({ type: "GOTO", index: 2, userInitiated: true });
    expect(result.step).toEqual({ from: 0, to: 2, direction: 1, fastForwarded: false });
    expect(machine.getState()).toEqual({ name: "transitioning", from: 0, to: 2, direction: 1 });
    machine.dispatch({ type: "TRANSITION_DONE" });
    expect(machine.getState()).toEqual({ name: "idle", index: 2 });
  });

  it("ignores GOTO to the current index", () => {
    const machine = createHeroMachine({ count: 5 });
    expect(machine.dispatch({ type: "GOTO", index: 0, userInitiated: true }).handled).toBe(false);
  });

  it("wraps negative and overflowing indices", () => {
    expect(wrapIndex(-1, 5)).toBe(4);
    expect(wrapIndex(7, 5)).toBe(2);
    const machine = createHeroMachine({ count: 5 });
    machine.dispatch({ type: "GOTO", index: -1, userInitiated: true });
    expect(machine.activeIndex()).toBe(4);
  });
});

describe("heroMachine wrap-around direction", () => {
  it("5 → 1 is forward, 1 → 5 is backward, 3 → 1 is backward", () => {
    expect(heroDirection(4, 0, 5)).toBe(1);
    expect(heroDirection(0, 4, 5)).toBe(-1);
    expect(heroDirection(2, 0, 5)).toBe(-1);
    expect(heroDirection(0, 1, 5)).toBe(1);
  });

  it("NEXT from the last slide wraps forward to the first", () => {
    const machine = createHeroMachine({ count: 5 });
    machine.dispatch({ type: "GOTO", index: 4, userInitiated: true });
    machine.dispatch({ type: "TRANSITION_DONE" });
    const result = machine.dispatch({ type: "NEXT" });
    expect(result.step).toMatchObject({ from: 4, to: 0, direction: 1 });
  });

  it("PREV from the first slide wraps backward to the last", () => {
    const machine = createHeroMachine({ count: 5 });
    const result = machine.dispatch({ type: "PREV" });
    expect(result.step).toMatchObject({ from: 0, to: 4, direction: -1 });
  });
});

describe("heroMachine interruptions", () => {
  it("fast-forwards the in-flight transition, then starts the next", () => {
    const machine = createHeroMachine({ count: 5 });
    machine.dispatch({ type: "GOTO", index: 1, userInitiated: true });
    const second = machine.dispatch({ type: "GOTO", index: 3, userInitiated: true });
    expect(second.step).toEqual({ from: 1, to: 3, direction: 1, fastForwarded: true });
    expect(machine.getState()).toEqual({ name: "transitioning", from: 1, to: 3, direction: 1 });
  });

  it("GOTO to the in-flight target simply lands it", () => {
    const machine = createHeroMachine({ count: 5 });
    machine.dispatch({ type: "GOTO", index: 2, userInitiated: true });
    const again = machine.dispatch({ type: "GOTO", index: 2, userInitiated: true });
    expect(again.step).toBeNull();
    expect(machine.getState()).toEqual({ name: "idle", index: 2 });
  });

  it("survives rapid GOTO spam and ends clean on the last target", () => {
    const machine = createHeroMachine({ count: 5 });
    for (const index of [1, 4, 0, 2, 4, 1, 3]) {
      machine.dispatch({ type: "GOTO", index, userInitiated: true });
    }
    machine.dispatch({ type: "TRANSITION_DONE" });
    expect(machine.getState()).toEqual({ name: "idle", index: 3 });
  });

  it("NEXT during a transition fast-forwards through", () => {
    const machine = createHeroMachine({ count: 5 });
    machine.dispatch({ type: "GOTO", index: 2, userInitiated: true });
    const next = machine.dispatch({ type: "NEXT" });
    expect(next.step).toMatchObject({ from: 2, to: 3, fastForwarded: true });
  });

  it("a superseded timeline's late TRANSITION_DONE is ignored", () => {
    const machine = createHeroMachine({ count: 5 });
    machine.dispatch({ type: "GOTO", index: 1, userInitiated: true });
    machine.dispatch({ type: "GOTO", index: 3, userInitiated: true }); // fast-forwards 1
    // Old timeline (to=1) settles late — must not land the in-flight 1→3.
    machine.dispatch({ type: "TRANSITION_DONE", index: 1 });
    expect(machine.getState()).toEqual({ name: "transitioning", from: 1, to: 3, direction: 1 });
    // The current timeline lands normally.
    machine.dispatch({ type: "TRANSITION_DONE", index: 3 });
    expect(machine.getState()).toEqual({ name: "idle", index: 3 });
  });

  it("TRANSITION_DONE while idle is a no-op", () => {
    const machine = createHeroMachine({ count: 5 });
    expect(machine.dispatch({ type: "TRANSITION_DONE" }).handled).toBe(false);
  });
});

describe("heroMachine pause reasons", () => {
  it("blocks autoplay while any pause reason is set", () => {
    const now = { value: 0 };
    const machine = scripted(now);
    for (const reason of [
      "hover",
      "focus-within",
      "offscreen",
      "document-hidden",
      "user-interacted",
      "reduced-motion",
    ] as const) {
      machine.dispatch({ type: "PAUSE", reason });
      expect(machine.isPaused()).toBe(true);
      expect(machine.canAutoplay()).toBe(false);
      machine.dispatch({ type: "AUTOPLAY_TICK" });
      expect(machine.getState().name).toBe("idle");
    }
  });

  it("resume removes exactly one reason", () => {
    const machine = createHeroMachine({ count: 5 });
    machine.dispatch({ type: "PAUSE", reason: "hover" });
    machine.dispatch({ type: "PAUSE", reason: "document-hidden" });
    machine.dispatch({ type: "RESUME", reason: "hover" });
    expect(machine.isPaused()).toBe(true);
    machine.dispatch({ type: "RESUME", reason: "document-hidden" });
    expect(machine.isPaused()).toBe(false);
    expect(machine.canAutoplay()).toBe(true);
  });

  it("duplicate pauses collapse into one reason", () => {
    const machine = createHeroMachine({ count: 5 });
    machine.dispatch({ type: "PAUSE", reason: "offscreen" });
    machine.dispatch({ type: "PAUSE", reason: "offscreen" });
    machine.dispatch({ type: "RESUME", reason: "offscreen" });
    expect(machine.isPaused()).toBe(false);
  });

  it("navigation still works under reduced motion (autoplay does not)", () => {
    const machine = createHeroMachine({ count: 5 });
    machine.dispatch({ type: "PAUSE", reason: "reduced-motion" });
    const result = machine.dispatch({ type: "GOTO", index: 3, userInitiated: true });
    expect(result.step).toMatchObject({ to: 3 });
    machine.dispatch({ type: "AUTOPLAY_TICK" });
    expect(machine.getState().name).toBe("transitioning"); // user GOTO ran; autoplay blocked separately
  });
});

describe("heroMachine user-interaction cooldown", () => {
  it("holds autoplay for 20s after a user-initiated navigation", () => {
    const now = { value: 0 };
    const machine = scripted(now);
    machine.dispatch({ type: "GOTO", index: 1, userInitiated: true });
    expect(machine.canAutoplay()).toBe(false);

    machine.dispatch({ type: "TRANSITION_DONE" });
    now.value = HERO_INTERACTION_COOLDOWN_MS - 1000;
    machine.tick();
    expect(machine.canAutoplay()).toBe(false);
    machine.dispatch({ type: "AUTOPLAY_TICK" });
    expect(machine.getState().name).toBe("idle"); // cooldown holds autoplay back

    now.value = HERO_INTERACTION_COOLDOWN_MS + 1;
    machine.tick();
    expect(machine.canAutoplay()).toBe(true);
    expect(machine.cooldownRemaining()).toBe(0);
  });

  it("does not start a cooldown for autoplay advances", () => {
    const now = { value: 0 };
    const machine = scripted(now);
    machine.dispatch({ type: "AUTOPLAY_TICK" });
    machine.dispatch({ type: "TRANSITION_DONE" });
    expect(machine.canAutoplay()).toBe(true);
  });

  it("the pause button is sticky: tick does not clear it", () => {
    const now = { value: 0 };
    const machine = scripted(now);
    machine.setPlayPaused(true);
    now.value = HERO_INTERACTION_COOLDOWN_MS * 10;
    machine.tick();
    expect(machine.isPlayPaused()).toBe(true);
    expect(machine.canAutoplay()).toBe(false);
    machine.setPlayPaused(false);
    expect(machine.canAutoplay()).toBe(true);
  });
});

describe("heroMachine autoplay cadence", () => {
  it("exposes the 7s interval contract", () => {
    expect(HERO_AUTOPLAY_MS).toBe(7000);
    expect(HERO_INTERACTION_COOLDOWN_MS).toBe(20000);
  });
});

describe("heroMachine complete() end states (H06)", () => {
  const COUNT = 5;

  function landAll(machine: ReturnType<typeof createHeroMachine>, config: { autoplayMs: number }) {
    expect(machine.autoplayMs).toBe(config.autoplayMs);
    for (let from = 0; from < COUNT; from += 1) {
      for (let to = 0; to < COUNT; to += 1) {
        if (to === from) continue;
        // Park on `from` (the previous pair left the machine on its own `to`).
        machine.dispatch({ type: "GOTO", index: from });
        machine.dispatch({ type: "TRANSITION_DONE", index: from });
        expect(machine.getState()).toEqual({ name: "idle", index: from });

        const result = machine.dispatch({ type: "GOTO", index: to, userInitiated: true });
        expect(result.step).toEqual({
          from,
          to,
          direction: heroDirection(from, to, COUNT),
          fastForwarded: false,
        });
        expect(machine.getState()).toEqual({
          name: "transitioning",
          from,
          to,
          direction: heroDirection(from, to, COUNT),
        });

        machine.dispatch({ type: "TRANSITION_DONE", index: to });
        // End-state snapshot: settled on `to`, autoplay held by the cooldown.
        expect(machine.getState()).toEqual({ name: "idle", index: to });
        expect(machine.activeIndex()).toBe(to);
        expect(machine.isPaused()).toBe(true);
        expect(machine.canAutoplay()).toBe(false);
        expect(machine.cooldownRemaining()).toBeGreaterThan(0);
        expect(machine.isPlayPaused()).toBe(false);
      }
    }
  }

  it("desktop cadence: all 20 from→to pairs land idle at `to` (7s)", () => {
    landAll(createHeroMachine({ count: COUNT, autoplayMs: HERO_AUTOPLAY_MS }), { autoplayMs: 7000 });
  });

  it("mobile cadence: same 20 end states at 6s", () => {
    landAll(createHeroMachine({ count: COUNT, autoplayMs: HERO_AUTOPLAY_MS_MOBILE }), { autoplayMs: 6000 });
  });

  it("exposes the cadence contract", () => {
    expect(HERO_AUTOPLAY_MS).toBe(7000);
    expect(HERO_AUTOPLAY_MS_MOBILE).toBe(6000);
    expect(HERO_INTERACTION_COOLDOWN_MS).toBe(20000);
  });

  it("touching freezes autoplay and the release holds the 20s cooldown", () => {
    const now = { value: 0 };
    const machine = createHeroMachine({ count: COUNT, autoplayMs: HERO_AUTOPLAY_MS_MOBILE, now: () => now.value });
    machine.dispatch({ type: "PAUSE", reason: "touching" });
    expect(machine.canAutoplay()).toBe(false);

    machine.dispatch({ type: "RESUME", reason: "touching" });
    expect(machine.canAutoplay()).toBe(true); // released without interaction → autoplay may resume

    machine.dispatch({ type: "PAUSE", reason: "touching" });
    machine.noteInteraction(); // the swipe itself starts the cooldown on release
    machine.dispatch({ type: "RESUME", reason: "touching" });
    expect(machine.canAutoplay()).toBe(false);
    now.value = HERO_INTERACTION_COOLDOWN_MS - 1;
    machine.tick();
    expect(machine.canAutoplay()).toBe(false);
    now.value = HERO_INTERACTION_COOLDOWN_MS + 1;
    machine.tick();
    expect(machine.canAutoplay()).toBe(true);
  });
});
