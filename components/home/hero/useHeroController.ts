"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  HERO_AUTOPLAY_MS,
  HERO_INTERACTION_COOLDOWN_MS,
  createHeroMachine,
  type HeroDirection,
  type HeroStep,
} from "@/components/home/hero/heroMachine";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

export type HeroAnnouncement = { key: number; text: string };

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function onIdle(window: Window, callback: () => void): () => void {
  const idleWindow = window as IdleWindow;
  if (typeof idleWindow.requestIdleCallback === "function") {
    const handle = idleWindow.requestIdleCallback(callback, { timeout: 2500 });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }
  const handle = window.setTimeout(callback, 600);
  return () => window.clearTimeout(handle);
}

/**
 * Drives the hero showcase: owns the machine, autoplay rAF progress, pause
 * reason bookkeeping, keyboard input, image preloading (slide 1 SSR, slide 2
 * on idle, the rest only after the first transition) and live-region copy.
 */
export function useHeroController(slides: { id: string; product: { name: string; pricePaise: number } }[]) {
  const count = slides.length;
  const { reduced } = useMotionPolicy();
  const machine = useMemo(() => createHeroMachine({ count: Math.max(1, count) }), [count]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<HeroDirection>(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [playPaused, setPlayPaused] = useState(false);
  const [announcement, setAnnouncement] = useState<HeroAnnouncement | null>(null);
  const [mountedImages, setMountedImages] = useState<Set<number>>(() => new Set(count > 0 ? [0] : []));

  const activeIndexRef = useRef(0);
  activeIndexRef.current = activeIndex;
  const progressRef = useRef(0);
  const progressListeners = useRef(new Set<(value: number) => void>());
  const interactedRef = useRef(false);
  const slidesRef = useRef(slides);
  slidesRef.current = slides;

  const onProgress = useCallback((listener: (value: number) => void) => {
    progressListeners.current.add(listener);
    listener(progressRef.current);
    return () => {
      progressListeners.current.delete(listener);
    };
  }, []);

  const applyStep = useCallback(
    (step: HeroStep | null) => {
      if (!step) return;
      setDirection(step.direction);
      setActiveIndex(step.to);
      setIsTransitioning(true);
      setMountedImages((current) => {
        if (current.has(step.to)) return current;
        const next = new Set(current);
        next.add(step.to);
        return next;
      });
    },
    [],
  );

  const navigate = useCallback(
    (event: Parameters<typeof machine.dispatch>[0], userInitiated: boolean) => {
      const manual =
        userInitiated &&
        (event.type === "NEXT" || event.type === "PREV" || event.type === "GOTO");
      const dispatched = machine.dispatch(manual ? { ...event, userInitiated: true } : event);
      applyStep(dispatched.step);
      if (dispatched.userInitiated) {
        interactedRef.current = true;
        const target = slidesRef.current[dispatched.step ? dispatched.step.to : activeIndexRef.current];
        if (target) {
          setAnnouncement({
            key: Date.now(),
            text: `${target.product.name}, ₹${Math.round(target.product.pricePaise / 100)}`,
          });
        }
      }
      return dispatched;
    },
    [applyStep, machine],
  );

  const goTo = useCallback((index: number) => navigate({ type: "GOTO", index }, true), [navigate]);
  const next = useCallback(() => navigate({ type: "NEXT" }, true), [navigate]);
  const prev = useCallback(() => navigate({ type: "PREV" }, true), [navigate]);

  const togglePlay = useCallback(() => {
    setPlayPaused((current) => {
      machine.setPlayPaused(!current);
      return !current;
    });
  }, [machine]);

  const complete = useCallback(() => {
    machine.dispatch({ type: "TRANSITION_DONE" });
    setIsTransitioning(false);
    progressRef.current = 0;
    for (const listener of progressListeners.current) listener(0);
    // First movement (any transition) unlocks the remaining images on idle.
    if (!interactedRef.current) {
      interactedRef.current = true;
      onIdle(window, () => {
        setMountedImages((current) => {
          if (current.size >= slidesRef.current.length) return current;
          return new Set(slidesRef.current.map((_, index) => index));
        });
      });
    }
  }, [machine]);

  // Reduced motion pauses autoplay; navigation stays available.
  useEffect(() => {
    machine.dispatch({ type: reduced ? "PAUSE" : "RESUME", reason: "reduced-motion" });
  }, [machine, reduced]);

  // Document visibility + hero visibility pause autoplay (WCAG + battery).
  useEffect(() => {
    const syncVisibility = (): void => {
      machine.dispatch({ type: document.hidden ? "PAUSE" : "RESUME", reason: "document-hidden" });
    };
    document.addEventListener("visibilitychange", syncVisibility);
    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, [machine]);

  useEffect(() => {
    const heroRoot = document.querySelector("[data-hero-root]");
    if (!heroRoot) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        machine.dispatch({ type: entry?.isIntersecting ? "RESUME" : "PAUSE", reason: "offscreen" });
      },
      { threshold: 0.25 },
    );
    observer.observe(heroRoot);
    return () => observer.disconnect();
  }, [machine]);

  useEffect(() => {
    const heroRoot = document.querySelector("[data-hero-root]");
    if (!heroRoot) return;
    const onEnter = (): void => {
      machine.dispatch({ type: "PAUSE", reason: "hover" });
    };
    const onLeave = (): void => {
      machine.dispatch({ type: "RESUME", reason: "hover" });
    };
    heroRoot.addEventListener("pointerenter", onEnter);
    heroRoot.addEventListener("pointerleave", onLeave);
    return () => {
      heroRoot.removeEventListener("pointerenter", onEnter);
      heroRoot.removeEventListener("pointerleave", onLeave);
    };
  }, [machine]);

  useEffect(() => {
    const heroRoot = document.querySelector("[data-hero-root]");
    if (!heroRoot) return;
    const onFocus = (): void => {
      machine.dispatch({ type: "PAUSE", reason: "focus-within" });
    };
    const onBlur = (event: Event): void => {
      const related = (event as FocusEvent).relatedTarget;
      if (!heroRoot.contains(related as Node | null)) {
        machine.dispatch({ type: "RESUME", reason: "focus-within" });
      }
    };
    heroRoot.addEventListener("focusin", onFocus);
    heroRoot.addEventListener("focusout", onBlur);
    return () => {
      heroRoot.removeEventListener("focusin", onFocus);
      heroRoot.removeEventListener("focusout", onBlur);
    };
  }, [machine]);

  // Single rAF drives autoplay progress; frozen while any pause reason is set.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const frame = (time: number): void => {
      raf = window.requestAnimationFrame(frame);
      const delta = time - last;
      last = time;
      machine.tick();
      if (!machine.canAutoplay()) {
        if (progressRef.current !== 0) {
          progressRef.current = 0;
          for (const listener of progressListeners.current) listener(0);
        }
        return;
      }
      const next = progressRef.current + delta / HERO_AUTOPLAY_MS;
      if (next >= 1) {
        progressRef.current = 0;
        for (const listener of progressListeners.current) listener(0);
        navigate({ type: "AUTOPLAY_TICK" }, false);
        return;
      }
      progressRef.current = next;
      for (const listener of progressListeners.current) listener(next);
    };
    raf = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(raf);
  }, [machine, navigate]);

  // Slide 2 preloads after hydration on idle; the rest wait for the first transition.
  useEffect(() => {
    const stop = onIdle(window, () => {
      setMountedImages((current) => {
        if (current.has(1) || count < 2) return current;
        const next = new Set(current);
        next.add(1);
        return next;
      });
    });
    return stop;
  }, [count]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      switch (event.key) {
        case "ArrowRight":
          event.preventDefault();
          void next();
          break;
        case "ArrowLeft":
          event.preventDefault();
          void prev();
          break;
        case "Home":
          event.preventDefault();
          void goTo(0);
          break;
        case "End":
          event.preventDefault();
          void goTo(count - 1);
          break;
        default:
          break;
      }
    },
    [count, goTo, next, prev],
  );

  return {
    count,
    activeIndex,
    direction,
    isTransitioning,
    playPaused,
    announcement,
    mountedImages,
    cooldownRemaining: HERO_INTERACTION_COOLDOWN_MS,
    goTo,
    next,
    prev,
    togglePlay,
    complete,
    onProgress,
    onKeyDown,
  };
}
