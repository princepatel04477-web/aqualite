"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";

import { useLenis } from "@/components/motion/SmoothScroll";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { markIntroDone } from "@/lib/motion/intro";
import { duration, gsapEase } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

export function TideIntro() {
  const root = useRef<HTMLDivElement>(null);
  const { reduced, tier } = useMotionPolicy();
  const { lock, unlock } = useLenis();
  const [live, setLive] = useState(true);

  useGSAP(
    () => {
      const node = root.current;
      if (!node) return;
      // Preloader is desktop-only; on touch/mobile we skip it entirely (M06).
      if (reduced || tier !== "high" || window.sessionStorage.getItem("aq-intro") === "1") {
        markIntroDone();
        setLive(false);
        return;
      }
      lock();
      const word = node.querySelector("[data-intro-word]");
      const line = node.querySelector("[data-intro-line]");
      const eye = node.querySelector("[data-intro-eye]");
      const tl = gsap.timeline({
        onComplete: () => {
          markIntroDone();
          unlock();
          ScrollTrigger.refresh();
          setLive(false);
        },
      });
      tl.from(eye, { y: 16, opacity: 0, duration: duration.base, ease: gsapEase.tide }, 0);
      tl.from(word, { yPercent: 40, opacity: 0, duration: duration.slow, ease: gsapEase.tide }, 0.08);
      tl.from(line, { scaleX: 0, duration: duration.base, ease: gsapEase.tide }, 0.35);
      tl.add(() => markIntroDone(), 0.72);
      tl.to(node, { yPercent: -100, duration: duration.cinematic, ease: gsapEase.tide }, 0.72);
      return () => {
        tl.kill();
        unlock();
      };
    },
    { scope: root, dependencies: [lock, reduced, unlock] },
  );

  if (!live) return null;

  return (
    <div ref={root} className="fixed inset-0 z-preloader flex items-center justify-center bg-abyss">
      <div className="text-center">
        <p data-intro-eye className="font-mono text-eyebrow uppercase text-aqua">
          Monsoon &apos;26
        </p>
        <p data-intro-word className="mt-4 font-display text-display text-foam">
          Aqualite
        </p>
        <div className="mx-auto mt-6 h-px w-36 bg-hairline">
          <div data-intro-line className="h-full origin-left bg-aqua" />
        </div>
      </div>
      <button
        type="button"
        className="sr-only focus:not-sr-only focus:absolute focus:bottom-8 focus:left-8 focus:bg-foam focus:px-3 focus:py-2 focus:text-abyss"
        onClick={() => {
          markIntroDone();
          unlock();
          setLive(false);
        }}
      >
        Skip intro
      </button>
    </div>
  );
}
