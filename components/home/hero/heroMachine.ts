/**
 * Hero showcase state machine (H03) — pure, UI-free, unit tested.
 *
 * idle(index) → transitioning(from, to, direction) → idle(to).
 * A navigation event during a transition fast-forwards the current one to
 * its end (the view calls its timeline `complete()`), then starts the next —
 * no queue pile-up, no half-states.
 */

export const HERO_AUTOPLAY_MS = 7000;
export const HERO_INTERACTION_COOLDOWN_MS = 20000;

export type HeroPauseReason =
  | "hover"
  | "focus-within"
  | "offscreen"
  | "document-hidden"
  | "user-interacted"
  | "reduced-motion";

export type HeroDirection = 1 | -1;

export type HeroState =
  | { name: "idle"; index: number }
  | { name: "transitioning"; from: number; to: number; direction: HeroDirection };

export type HeroEvent =
  | { type: "NEXT"; userInitiated?: boolean }
  | { type: "PREV"; userInitiated?: boolean }
  | { type: "GOTO"; index: number; userInitiated?: boolean }
  | { type: "AUTOPLAY_TICK" }
  | { type: "PAUSE"; reason: HeroPauseReason }
  | { type: "RESUME"; reason: HeroPauseReason }
  | { type: "TRANSITION_DONE" };

export type HeroStep = {
  from: number;
  to: number;
  direction: HeroDirection;
  /** True when an in-flight transition was fast-forwarded to make room. */
  fastForwarded: boolean;
};

export type HeroDispatchResult = {
  handled: boolean;
  step: HeroStep | null;
  /** User-initiated steps start the 20s autoplay cooldown. */
  userInitiated: boolean;
};

export type HeroMachine = {
  count: number;
  getState(): HeroState;
  activeIndex(): number;
  isPaused(): boolean;
  canAutoplay(): boolean;
  /** Milliseconds left on the post-interaction cooldown (0 when clear). */
  cooldownRemaining(): number;
  /** Time-based housekeeping (cooldown expiry); call each animation frame. */
  tick(): void;
  /** The pause/play button: a sticky pause that outlives the 20s cooldown. */
  setPlayPaused(paused: boolean): void;
  isPlayPaused(): boolean;
  dispatch(event: HeroEvent): HeroDispatchResult;
};

export function wrapIndex(index: number, count: number): number {
  return ((index % count) + count) % count;
}

/** Forward when the wrap-around distance is the short way round (5 → 1 is forward). */
export function heroDirection(from: number, to: number, count: number): HeroDirection {
  const forward = wrapIndex(to - from, count);
  return forward <= count / 2 ? 1 : -1;
}

export function createHeroMachine(options: { count: number; now?: () => number }): HeroMachine {
  const count = options.count;
  if (count < 1) throw new Error("A hero needs at least one slide.");
  const now = options.now ?? (() => Date.now());

  let state: HeroState = { name: "idle", index: 0 };
  const pauses = new Set<HeroPauseReason>();
  let cooldownUntil = 0;
  let stickyPause = false;

  const noStep: HeroDispatchResult = { handled: false, step: null, userInitiated: false };

  function startTransition(from: number, to: number, fastForwarded: boolean): HeroDispatchResult {
    const direction = heroDirection(from, to, count);
    state = { name: "transitioning", from, to, direction };
    return { handled: true, step: { from, to, direction, fastForwarded }, userInitiated: false };
  }

  function completeTransition(): number | null {
    if (state.name !== "transitioning") return null;
    const to = state.to;
    state = { name: "idle", index: to };
    return to;
  }

  const machine: HeroMachine = {
    count,
    getState: () => state,
    activeIndex: () => (state.name === "transitioning" ? state.to : state.index),
    isPaused: () => pauses.size > 0,
    canAutoplay: () => pauses.size === 0 && now() >= cooldownUntil,
    cooldownRemaining: () => Math.max(0, cooldownUntil - now()),

    tick() {
      if (stickyPause) return;
      if (pauses.has("user-interacted") && now() >= cooldownUntil) {
        pauses.delete("user-interacted");
      }
    },

    setPlayPaused(paused: boolean) {
      stickyPause = paused;
      if (paused) {
        pauses.add("user-interacted");
        cooldownUntil = now() + HERO_INTERACTION_COOLDOWN_MS;
      } else {
        pauses.delete("user-interacted");
        cooldownUntil = 0;
      }
    },

    isPlayPaused: () => stickyPause,

    dispatch(event) {
      const user = event.type === "AUTOPLAY_TICK" ? false : Boolean("userInitiated" in event && event.userInitiated);

      if (event.type === "PAUSE") {
        pauses.add(event.reason);
        return noStep;
      }
      if (event.type === "RESUME") {
        pauses.delete(event.reason);
        return noStep;
      }
      if (event.type === "TRANSITION_DONE") {
        const done = completeTransition();
        return done === null ? noStep : { handled: true, step: null, userInitiated: false };
      }
      if (event.type === "AUTOPLAY_TICK" && !machine.canAutoplay()) {
        // Autoplay runs only when the pause set is empty and the cooldown is clear.
        return noStep;
      }

      // Navigation events below.
      let fastForwarded = false;
      if (state.name === "transitioning") {
        if (event.type === "GOTO" && event.index === state.to) {
          // Already heading there; land the current timeline only.
          completeTransition();
          return { handled: true, step: null, userInitiated: user };
        }
        completeTransition();
        fastForwarded = true;
      }

      const from = state.name === "idle" ? state.index : 0;

      if (event.type === "NEXT") {
        const to = wrapIndex(from + 1, count);
        const result = startTransition(from, to, fastForwarded);
        result.userInitiated = user;
        if (user) {
          pauses.add("user-interacted");
          cooldownUntil = now() + HERO_INTERACTION_COOLDOWN_MS;
        }
        return result;
      }
      if (event.type === "PREV") {
        const to = wrapIndex(from - 1, count);
        const result = startTransition(from, to, fastForwarded);
        result.userInitiated = user;
        if (user) {
          pauses.add("user-interacted");
          cooldownUntil = now() + HERO_INTERACTION_COOLDOWN_MS;
        }
        return result;
      }
      if (event.type === "AUTOPLAY_TICK") {
        const to = wrapIndex(from + 1, count);
        return startTransition(from, to, fastForwarded);
      }
      if (event.type === "GOTO") {
        const to = wrapIndex(event.index, count);
        if (to === from) return noStep;
        const result = startTransition(from, to, fastForwarded);
        result.userInitiated = user;
        if (user) {
          pauses.add("user-interacted");
          cooldownUntil = now() + HERO_INTERACTION_COOLDOWN_MS;
        }
        return result;
      }
      return noStep;
    },
  };

  return machine;
}
