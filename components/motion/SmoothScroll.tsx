"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from "react";

import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

type LenisLike = {
  raf: (time: number) => void;
  on: (event: "scroll", cb: () => void) => void;
  stop: () => void;
  start: () => void;
  scrollTo: (target: number | string, opts?: { immediate?: boolean }) => void;
  destroy: () => void;
};

type LenisApi = {
  stop: () => void;
  start: () => void;
  scrollTo: (target: number | string, immediate?: boolean) => void;
  lock: () => void;
  unlock: () => void;
};

const LenisContext = createContext<LenisApi>({
  stop: () => undefined,
  start: () => undefined,
  scrollTo: () => undefined,
  lock: () => undefined,
  unlock: () => undefined,
});

export function useLenis(): LenisApi {
  return useContext(LenisContext);
}

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const { reduced, tier } = useMotionPolicy();
  const lenisRef = useRef<LenisLike | null>(null);
  const locked = useRef(0);
  const scrollY = useRef(0);

  useEffect(() => {
    // Touch devices use native scrolling — never download Lenis on mobile.
    if (reduced || tier === "low") return;
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) return;
    let alive = true;
    let ticker: ((time: number) => void) | null = null;
    void import("lenis").then((mod) => {
      if (!alive) return;
      const Lenis = mod.default;
      const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false }) as LenisLike;
      lenisRef.current = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      ScrollTrigger.refresh();
      ticker = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(ticker);
      gsap.ticker.lagSmoothing(0);
    });
    return () => {
      alive = false;
      if (ticker) gsap.ticker.remove(ticker);
      lenisRef.current?.destroy();
      lenisRef.current = null;
    };
  }, [reduced, tier]);

  const api = useMemo<LenisApi>(
    () => ({
      stop: () => lenisRef.current?.stop(),
      start: () => lenisRef.current?.start(),
      scrollTo: (target, immediate) => lenisRef.current?.scrollTo(target, { immediate }),
      lock: () => {
        locked.current += 1;
        if (locked.current !== 1) return;
        scrollY.current = window.scrollY;
        lenisRef.current?.stop();
        document.body.style.position = "fixed";
        document.body.style.top = `-${scrollY.current}px`;
        document.body.style.left = "0";
        document.body.style.right = "0";
        document.body.style.width = "100%";
      },
      unlock: () => {
        locked.current = Math.max(0, locked.current - 1);
        if (locked.current !== 0) return;
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        window.scrollTo(0, scrollY.current);
        lenisRef.current?.start();
      },
    }),
    [],
  );

  return <LenisContext.Provider value={api}>{children}</LenisContext.Provider>;
}
