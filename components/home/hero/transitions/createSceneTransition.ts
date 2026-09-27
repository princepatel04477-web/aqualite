import { gsap } from "@/lib/motion/gsap";

import { setGlow, tweenGlow } from "@/components/home/hero/transitions/glow";
import { waveWipe } from "@/components/home/hero/transitions/waveWipe";
import { SplitText } from "@/lib/motion/gsap";
import { gsapEase, hero } from "@/lib/motion/tokens";
import type { HeroDirection } from "@/components/home/hero/heroMachine";

export type TransitionPolicy = {
  tier: "low" | "medium" | "high";
  reduced: boolean;
};

export type TransitionSlides = {
  from: { eyebrow: string; glowHex: string };
  to: { eyebrow: string; glowHex: string };
};

export type SceneTransitionArgs = {
  root: HTMLElement;
  from: number;
  to: number;
  direction: HeroDirection;
  policy: TransitionPolicy;
  slides: TransitionSlides;
  /** Called once the incoming shoe has surfaced — resumes the Buoyancy float. */
  onFloatHandover: (index: number) => void;
  /** Called when this transition reaches its end naturally or via complete(). */
  onSettled: (index: number) => void;
};

export type SceneTransition = {
  timeline: gsap.core.Timeline;
  /** Jump to the end state instantly (interruptions, tests). Idempotent. */
  complete: () => void;
  /** Jump to the end state, then tear everything down. Idempotent. */
  kill: () => void;
};

const SCRAMBLE_CHARS = "·—/\\|=+~";

/** Token channel reader — colors come from tokens.css, never literals. */
function tokenRgb(name: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = raw.split(/[\s,]+/).map(Number);
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return "rgb(238 241 238)";
  return `rgb(${parts[0]} ${parts[1]} ${parts[2]})`;
}

function scrambleIn(element: HTMLElement, finalText: string, duration: number): gsap.core.Tween {
  const proxy = { p: 0 };
  const length = finalText.length;
  return gsap.to(proxy, {
    p: 1,
    duration,
    ease: "none",
    onUpdate: () => {
      const shown = Math.floor(proxy.p * length);
      let noise = "";
      for (let i = shown; i < length; i += 1) {
        noise += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)] ?? "";
      }
      element.textContent = finalText.slice(0, shown) + noise;
    },
  });
}

/**
 * The signature scene change (H04): one GSAP timeline, 1.1–1.3s,
 * interruptible. Forward direction sinks the outgoing shoe and wets in the
 * next through a travelling wave; backward mirrors the x-offsets.
 *
 * Policy tiers: high = full timeline (wave wipe, brightness sink);
 * medium = crossfaded background, no filter, shoe motion kept;
 * low / reduced motion = 0.25s opacity crossfade only, counter without roll.
 *
 * Only transform, opacity, clip-path, filter (high tier) and the glow
 * variable animate — no layout properties. will-change is set during the
 * transition and cleared after. SplitText instances are created per
 * transition and reverted on complete so screen readers always read the
 * plain headline.
 */
export function createSceneTransition(args: SceneTransitionArgs): SceneTransition {
  const { root, from, to, direction, policy, slides, onFloatHandover, onSettled } = args;
  const mirror = direction === -1 ? -1 : 1;

  const outgoingShoe = root.querySelector<HTMLElement>(`[data-hero-shoe="${from}"]`);
  const incomingShoe = root.querySelector<HTMLElement>(`[data-hero-shoe="${to}"]`);
  const outgoingContent = root.querySelector<HTMLElement>(`[data-hero-content="${from}"]`);
  const incomingContent = root.querySelector<HTMLElement>(`[data-hero-content="${to}"]`);
  const outgoingHeadline = outgoingContent?.querySelector<HTMLElement>("[data-hero-headline]") ?? null;
  const incomingHeadline = incomingContent?.querySelector<HTMLElement>("[data-hero-headline]") ?? null;
  const outgoingMeta = outgoingContent?.querySelectorAll<HTMLElement>("[data-meta]") ?? [];
  const incomingMeta = incomingContent?.querySelectorAll<HTMLElement>("[data-meta]") ?? [];
  const incomingLead = incomingContent?.querySelector<HTMLElement>("[data-hero-lead]") ?? null;
  const incomingCtas = incomingContent?.querySelectorAll<HTMLElement>("[data-hero-ctas] > *") ?? [];
  const incomingEm = incomingHeadline ? Array.from(incomingHeadline.querySelectorAll("em")) : [];
  const outgoingFloat = outgoingShoe?.querySelector("[data-float]") ?? null;
  const incomingFloat = incomingShoe?.querySelector("[data-float]") ?? null;
  const ripples = root.querySelector<HTMLElement>("[data-hero-ripples]");
  const eyebrowText = incomingContent?.querySelector<HTMLElement>("[data-hero-eyebrow-text]") ?? null;

  const reduced = policy.reduced || policy.tier === "low";
  const splits: { revert: () => void }[] = [];
  const finishers: (() => void)[] = [];
  let finished = false;

  // Single convergence point: end-state visuals, cleanup, float handover.
  // settle=false when a newer transition superseded this one (no DONE event).
  const finish = (settle: boolean): void => {
    if (finished) return;
    finished = true;
    timeline.kill();
    for (const split of splits) split.revert();
    for (const done of finishers) done();
    splits.length = 0;
    finishers.length = 0;
    onFloatHandover(to);
    if (settle) onSettled(to);
  };

  const timeline = gsap.timeline({ paused: true, onComplete: () => finish(true) });

  const jumpToEnd = (settle: boolean): void => {
    if (!finished) timeline.progress(1, false);
    finish(settle);
  };

  if (!outgoingShoe || !incomingShoe || !outgoingContent || !incomingContent) {
    setGlow(incomingShoe ?? root, slides.to.glowHex);
    finish(true);
    return { timeline, complete: () => jumpToEnd(true), kill: () => jumpToEnd(false) };
  }

  // Exactly one floating shoe: stop both, hand over at finish.
  if (outgoingFloat) gsap.killTweensOf(outgoingFloat);
  if (incomingFloat) gsap.killTweensOf(incomingFloat);

  if (reduced) {
    // Low / reduced motion: 0.25s opacity crossfade of the whole scene.
    setGlow(incomingShoe, slides.to.glowHex);
    gsap.set(outgoingShoe, { visibility: "inherit", zIndex: 1, willChange: "opacity" });
    gsap.set(incomingShoe, { visibility: "inherit", zIndex: 2, willChange: "opacity" });
    gsap.set(outgoingContent, { visibility: "inherit", willChange: "opacity" });
    gsap.set(incomingContent, { visibility: "inherit", opacity: 0, willChange: "opacity" });
    timeline.to(outgoingShoe, { opacity: 0, duration: hero.crossfadeReduced, ease: "none" }, 0);
    timeline.to(outgoingContent, { opacity: 0, duration: hero.crossfadeReduced, ease: "none" }, 0);
    timeline.fromTo(incomingShoe, { opacity: 0 }, { opacity: 1, duration: hero.crossfadeReduced, ease: "none" }, 0);
    timeline.fromTo(
      incomingContent,
      { opacity: 0 },
      { opacity: 1, duration: hero.crossfadeReduced, ease: "none" },
      0,
    );
    finishers.push(() => {
      gsap.set([outgoingShoe, incomingShoe, outgoingContent, incomingContent], { clearProps: "all" });
    });
    return { timeline, complete: () => jumpToEnd(true), kill: () => jumpToEnd(false) };
  }

  // --- High / medium tiers -------------------------------------------------
  const useWave = policy.tier === "high";

  gsap.set(outgoingShoe, { visibility: "inherit", zIndex: 2, willChange: "transform, opacity, filter" });
  gsap.set(incomingShoe, { visibility: "inherit", zIndex: 3, willChange: "transform, opacity" });
  gsap.set(outgoingContent, { visibility: "inherit", willChange: "transform, opacity" });

  // Outgoing shoe: sinking (t=0). Backward mirrors the x-offsets.
  const sinkVars: gsap.TweenVars = {
    yPercent: hero.sinkY,
    rotate: hero.sinkRotate * mirror,
    scale: hero.sinkScale,
    opacity: 0,
    duration: hero.sink,
    ease: "power2.in",
  };
  if (mirror === -1) sinkVars.xPercent = 2;
  if (policy.tier === "high") sinkVars.filter = "brightness(0.6)";
  timeline.to(outgoingShoe.querySelector("[data-shoe]"), sinkVars, 0);

  // Outgoing headline: Wet Ink lines rise out, italic line last (t=0).
  if (outgoingHeadline) {
    const split = SplitText.create(outgoingHeadline);
    splits.push(split);
    timeline.to(
      split.lines,
      { yPercent: -105, duration: hero.headlineOut, stagger: hero.headlineOutStagger, ease: "power2.in" },
      0,
    );
  }

  // Outgoing lead + CTAs (t=0.05).
  timeline.to(outgoingMeta, { opacity: 0, y: -8, duration: hero.metaOut, ease: "power2.in" }, hero.metaOutOffset);

  // Incoming backdrop reveal (t=0.15): wave wipe on high, crossfade on medium.
  let wave: { tween: gsap.core.Tween; reset: () => void } | null = null;
  if (useWave) {
    wave = waveWipe(incomingShoe, hero.wave);
    timeline.add(wave.tween, hero.waveOffset);
  } else {
    gsap.set(incomingShoe, { opacity: 0 });
    timeline.to(incomingShoe, { opacity: 1, duration: hero.crossfadeMedium, ease: "power2.inOut" }, hero.waveOffset);
  }

  // Glow var morph (t=0.20): one variable, every reader follows.
  setGlow(incomingShoe, slides.from.glowHex);
  timeline.add(tweenGlow(incomingShoe, slides.from.glowHex, slides.to.glowHex, hero.glow), hero.glowOffset);

  // Eyebrow scramble (t=0.35), only when the eyebrow actually changes.
  if (eyebrowText && eyebrowText.textContent !== slides.to.eyebrow) {
    const original = eyebrowText.textContent ?? "";
    timeline.add(
      () => {
        scrambleIn(eyebrowText, slides.to.eyebrow, hero.eyebrow);
      },
      hero.eyebrowOffset,
    );
    finishers.push(() => {
      eyebrowText.textContent = slides.to.eyebrow;
      void original;
    });
  }

  // Incoming shoe: surfacing (t=0.45).
  timeline.fromTo(
    incomingShoe.querySelector("[data-shoe]"),
    {
      yPercent: hero.surfaceY,
      xPercent: mirror === -1 ? -2 : 0,
      rotate: hero.surfaceRotate * mirror,
      scale: hero.surfaceScale,
      opacity: 0,
    },
    {
      yPercent: 0,
      xPercent: 0,
      rotate: 0,
      scale: 1,
      opacity: 1,
      duration: hero.surface,
      ease: "back.out(1.4)",
    },
    hero.surfaceOffset,
  );

  // Incoming headline: Wet Ink rise (t=0.55); em settles foam → sand after landing.
  if (incomingHeadline) {
    const split = SplitText.create(incomingHeadline);
    splits.push(split);
    const lastLine = split.lines.length - 1;
    timeline.fromTo(
      split.lines,
      { yPercent: 105 },
      { yPercent: 0, duration: hero.headlineIn, stagger: hero.headlineInStagger, ease: gsapEase.tide },
      hero.headlineInOffset,
    );
    const foam = tokenRgb("--foam");
    const sand = tokenRgb("--sand");
    for (const em of incomingEm) {
      timeline.fromTo(
        em,
        { color: foam },
        { color: sand, duration: hero.emShift, ease: "none", immediateRender: false },
        hero.headlineInOffset + lastLine * hero.headlineInStagger + hero.emShift,
      );
    }
  }

  // Incoming lead (t=0.75) and CTAs (t=0.85).
  if (incomingLead) {
    timeline.fromTo(
      incomingLead,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: hero.leadIn, ease: gsapEase.tide },
      hero.leadInOffset,
    );
  }
  if (incomingCtas.length > 0) {
    timeline.fromTo(
      incomingCtas,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: hero.ctasIn, stagger: hero.headlineInStagger, ease: gsapEase.tide },
      hero.ctasInOffset,
    );
  }

  // Ripples drift once, suggesting water moving (transform only; scale guards edges).
  if (ripples) {
    timeline.fromTo(
      ripples,
      { xPercent: -hero.driftX / 2, scale: 1.03 },
      { xPercent: hero.driftX / 2, duration: hero.rippleDrift, ease: "sine.inOut" },
      0,
    );
  }

  finishers.push(() => {
    wave?.reset();
    gsap.set([outgoingShoe, incomingShoe], { clearProps: "visibility,zIndex,opacity,willChange,clipPath,filter" });
    const shoes = [outgoingShoe.querySelector("[data-shoe]"), incomingShoe.querySelector("[data-shoe]")];
    gsap.set(shoes, { clearProps: "transform,opacity,filter" });
    gsap.set([outgoingMeta, incomingMeta, incomingLead], { clearProps: "transform,opacity" });
    gsap.set(Array.from(incomingCtas), { clearProps: "transform,opacity" });
    gsap.set(outgoingContent, { clearProps: "visibility,willChange,opacity" });
    gsap.set(incomingContent, { clearProps: "willChange" });
    for (const em of incomingEm) em.style.removeProperty("color");
    if (ripples) gsap.set(ripples, { clearProps: "transform" });
  });

  return {
    timeline,
    complete: () => jumpToEnd(true),
    kill: () => jumpToEnd(false),
  };
}
