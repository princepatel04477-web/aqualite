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
  onFloatHandover: (index: number) => void;
  onSettled: (index: number) => void;
};

export type SceneTransition = {
  timeline: gsap.core.Timeline;
  complete: () => void;
  kill: () => void;
};

const SCRAMBLE_CHARS = "·—/\\|=+~";

function tokenRgb(name: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = raw.split(/[\s,]+/).map(Number);
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return "rgb(27 23 20)";
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
 * Scene transition (H04 / R03):
 * Keeps the slide change animation on the Ivory & Red palette — no dark-theme
 * brightness dip or dark glow. Halo colour crossfades per slide, and shoe
 * motion stays strictly inside the upper-right shoe stage so no text ever
 * overlaps the shoe at any moment of the transition.
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

  if (outgoingFloat) gsap.killTweensOf(outgoingFloat);
  if (incomingFloat) gsap.killTweensOf(incomingFloat);

  if (reduced) {
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

  const useWave = policy.tier === "high";

  gsap.set(outgoingShoe, { visibility: "inherit", zIndex: 2, willChange: "transform, opacity" });
  gsap.set(incomingShoe, { visibility: "inherit", zIndex: 3, willChange: "transform, opacity" });
  gsap.set(outgoingContent, { visibility: "inherit", willChange: "transform, opacity" });

  // Outgoing shoe: clean lift/settle without dark brightness dip (R03).
  const sinkVars: gsap.TweenVars = {
    yPercent: 4,
    rotate: hero.sinkRotate * mirror,
    scale: hero.sinkScale,
    opacity: 0,
    duration: hero.sink,
    ease: "power2.in",
  };
  if (mirror === -1) sinkVars.xPercent = 2;
  timeline.to(outgoingShoe.querySelector("[data-shoe]"), sinkVars, 0);

  if (outgoingHeadline) {
    const split = SplitText.create(outgoingHeadline);
    splits.push(split);
    timeline.to(
      split.lines,
      { yPercent: -105, duration: hero.headlineOut, stagger: hero.headlineOutStagger, ease: "power2.in" },
      0,
    );
  }

  timeline.to(outgoingMeta, { opacity: 0, y: -6, duration: hero.metaOut, ease: "power2.in" }, hero.metaOutOffset);

  let wave: { tween: gsap.core.Tween; reset: () => void } | null = null;
  if (useWave) {
    wave = waveWipe(incomingShoe, hero.wave);
    timeline.add(wave.tween, hero.waveOffset);
  } else {
    gsap.set(incomingShoe, { opacity: 0 });
    timeline.to(incomingShoe, { opacity: 1, duration: hero.crossfadeMedium, ease: "power2.inOut" }, hero.waveOffset);
  }

  // Halo colour crossfade per slide.
  setGlow(incomingShoe, slides.from.glowHex);
  timeline.add(tweenGlow(incomingShoe, slides.from.glowHex, slides.to.glowHex, hero.glow), hero.glowOffset);

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

  // Incoming shoe surfaces inside the upper-right shoe stage.
  timeline.fromTo(
    incomingShoe.querySelector("[data-shoe]"),
    {
      yPercent: 5,
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
    const ink = tokenRgb("--ink");
    const redInk = tokenRgb("--red-ink");
    for (const em of incomingEm) {
      timeline.fromTo(
        em,
        { color: ink },
        { color: redInk, duration: hero.emShift, ease: "none", immediateRender: false },
        hero.headlineInOffset + lastLine * hero.headlineInStagger + hero.emShift,
      );
    }
  }

  if (incomingLead) {
    timeline.fromTo(
      incomingLead,
      { opacity: 0, y: 10 },
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
