"use client";

import { useCallback, useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";

import { createSceneTransition } from "@/components/home/hero/transitions/createSceneTransition";
import { WaveClipDef } from "@/components/home/hero/transitions/waveWipe";
import type { HeroStep } from "@/components/home/hero/heroMachine";
import type { HeroSlide } from "@/lib/commerce/types";
import { gsap } from "@/lib/motion/gsap";
import { whenIntroDone } from "@/lib/motion/intro";
import { duration, gsapEase, stagger } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

export function HeroDesktopEngine({
  rootRef,
  slides,
  activeIndex,
  lastStep,
  isTransitioning,
  onComplete,
}: {
  rootRef: React.RefObject<HTMLElement | null>;
  slides: HeroSlide[];
  activeIndex: number;
  lastStep: HeroStep | null;
  isTransitioning: boolean;
  onComplete: (index: number) => void;
}) {
  const { allowCursorFX, reduced, tier } = useMotionPolicy();
  const activeIndexRef = useRef(activeIndex);
  const floatTween = useRef<gsap.core.Tween | null>(null);
  const completeRef = useRef(onComplete);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
    completeRef.current = onComplete;
  }, [activeIndex, onComplete]);

  // Bounded Buoyancy float so the shoe always stays inside its upper-right stage.
  const startFloat = useCallback(
    (index: number) => {
      floatTween.current?.kill();
      const node = rootRef.current;
      const target = node?.querySelector(`[data-hero-shoe="${index}"] [data-float]`);
      if (!target) return;
      gsap.killTweensOf(target);
      floatTween.current = gsap.to(target, {
        y: 6,
        rotate: 1.0,
        duration: duration.cinematic * 2,
        yoyo: true,
        repeat: -1,
        ease: gsapEase.drift,
        delay: duration.cinematic,
      });
    },
    [rootRef],
  );

  const stepKey = lastStep ? `${lastStep.from}-${lastStep.to}-${lastStep.direction}` : "none";
  useEffect(() => {
    const node = rootRef.current;
    const step = lastStep;
    if (!node || !step || !isTransitioning) return;
    const fromSlide = slides[step.from];
    const toSlide = slides[step.to];
    if (!fromSlide || !toSlide) return;

    const transition = createSceneTransition({
      root: node,
      from: step.from,
      to: step.to,
      direction: step.direction,
      policy: { tier, reduced },
      slides: {
        from: { eyebrow: fromSlide.eyebrow, glowHex: fromSlide.glowHex },
        to: { eyebrow: toSlide.eyebrow, glowHex: toSlide.glowHex },
      },
      onFloatHandover: startFloat,
      onSettled: (index) => completeRef.current(index),
    });
    transition.timeline.play();
    return () => {
      transition.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, isTransitioning, tier, reduced, startFloat]);

  useEffect(() => {
    if (isTransitioning) return;
    if (reduced) return;
    startFloat(activeIndex);
    return () => {
      floatTween.current?.kill();
    };
  }, [activeIndex, isTransitioning, reduced, startFloat]);

  useGSAP(
    () => {
      const node = rootRef.current;
      if (!node || reduced) return;

      const firstShoe = node.querySelector('[data-hero-shoe="0"] [data-shoe]');
      const firstLines = node.querySelectorAll('[data-hero-content="0"] [data-line]');
      const firstMeta = node.querySelectorAll('[data-hero-content="0"] [data-meta], [data-hero-band] [data-meta]');
      const meter = node.querySelector("[data-scroll-line]");

      const intro = gsap.timeline({ paused: true });
      intro.from(firstShoe, { y: 18, scale: 1.03, opacity: 0, duration: duration.cinematic, ease: gsapEase.tide }, 0);
      intro.from(firstLines, { yPercent: 110, duration: duration.slow, stagger: stagger.loose, ease: gsapEase.tide }, 0.15);
      intro.from(firstMeta, { y: 14, opacity: 0, duration: duration.base, stagger: stagger.base, ease: gsapEase.tide }, 0.35);
      const stopWait = whenIntroDone(() => intro.play());
      const fallbackTimer = window.setTimeout(() => intro.play(), 2800);

      let onMove: ((event: PointerEvent) => void) | null = null;
      if (allowCursorFX) {
        const quick: { xTo: gsap.QuickToFunc; yTo: gsap.QuickToFunc }[] = [];
        for (let index = 0; index < slides.length; index += 1) {
          const parallax = node.querySelector(`[data-hero-shoe="${index}"] [data-parallax]`);
          if (parallax) {
            quick.push({
              xTo: gsap.quickTo(parallax, "x", { duration: duration.base, ease: gsapEase.tide }),
              yTo: gsap.quickTo(parallax, "y", { duration: duration.base, ease: gsapEase.tide }),
            });
          }
        }
        onMove = (event: PointerEvent) => {
          const rect = node.getBoundingClientRect();
          const px = (event.clientX - rect.left) / rect.width - 0.5;
          const py = (event.clientY - rect.top) / rect.height - 0.5;
          const pair = quick[activeIndexRef.current];
          pair?.xTo(px * 16);
          pair?.yTo(py * 8);
        };
        node.addEventListener("pointermove", onMove);
      }

      const meterTween = meter
        ? gsap.fromTo(
            meter,
            { yPercent: -120 },
            { yPercent: 140, duration: duration.cinematic, repeat: -1, ease: gsapEase.linear },
          )
        : null;

      return () => {
        stopWait();
        window.clearTimeout(fallbackTimer);
        intro.kill();
        meterTween?.kill();
        if (onMove) node.removeEventListener("pointermove", onMove);
      };
    },
    { scope: rootRef, dependencies: [allowCursorFX, reduced, slides.length] },
  );

  return <WaveClipDef />;
}
