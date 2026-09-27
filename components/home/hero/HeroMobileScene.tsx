"use client";

import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";

import { HeroCounter } from "@/components/home/hero/HeroCounter";
import { HeroPriceBlock } from "@/components/home/hero/HeroPriceBlock";
import { HeroThumbRail } from "@/components/home/hero/HeroThumbRail";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { heroImage, preloadHeroImage } from "@/lib/catalog/hero-image";
import type { HeroSlide } from "@/lib/commerce/types";
import { duration, ease, hero } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

function pad(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/** The mobile lead is the first sentence only (H06). */
function firstSentenceOf(lead: string): string {
  const match = lead.match(/^.*?[.!?](?=\s|$)/);
  return (match ? match[0] : lead).trim();
}

const SWIPE_INTENT_PX = 16;
const SWIPE_COMMIT_RATIO = 0.25;

/**
 * H06 motion tier (Motion only — no wave wipe, no filters, no GSAP):
 * copy slides out at x−24 / fades over 0.25s and in from x+24 over 0.35s;
 * the shoe image rises 12px into place, then floats at half Buoyancy amp;
 * the glow morphs purely in CSS via the --hero-glow custom property.
 */
const sceneVariants = (reduced: boolean) => ({
  enter: {
    x: hero.mobile.outX,
    opacity: 0,
    transition: { duration: reduced ? 0 : hero.mobile.inDuration, ease: ease.tide },
  },
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: reduced ? 0 : hero.mobile.inDuration, ease: ease.tide },
  },
  exit: {
    x: -hero.mobile.outX,
    opacity: 0,
    transition: { duration: reduced ? 0 : hero.mobile.outDuration, ease: ease.tide },
  },
});

const riseVariants = (reduced: boolean) => ({
  enter: { y: hero.mobile.riseY, opacity: 0, transition: { duration: reduced ? 0 : hero.mobile.inDuration, ease: ease.tide } },
  center: { y: 0, opacity: 1, transition: { duration: reduced ? 0 : hero.mobile.inDuration, ease: ease.tide } },
  exit: { opacity: 0, transition: { duration: reduced ? 0 : hero.mobile.outDuration, ease: ease.tide } },
});

/**
 * The <1024px showcase (H06): a single stacked scene — eyebrow + counter,
 * the 4:5 mobile image over the morphing glow, headline, price line, first
 * sentence and side-by-side 48px CTAs — with horizontal swipe (16px intent,
 * 25% commit) and a below-fold snap row of 56px thumbs. Only slide 1's
 * image is eager.
 */
export function HeroMobileScene({
  slides,
  activeIndex,
  isTransitioning,
  playPaused,
  onTogglePlay,
  onSelect,
  onNext,
  onPrev,
  onComplete,
  onProgress,
}: {
  slides: HeroSlide[];
  activeIndex: number;
  isTransitioning: boolean;
  playPaused: boolean;
  onTogglePlay: () => void;
  onSelect: (index: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onComplete: (index: number) => void;
  onProgress?: (listener: (value: number) => void) => () => void;
}) {
  const { reduced } = useMotionPolicy();
  const dragRef = useRef<HTMLDivElement>(null);
  const active = slides[activeIndex] ?? slides[0];
  const firstSentence = useMemo(() => (active ? firstSentenceOf(active.lead) : ""), [active]);
  const scene = sceneVariants(reduced);
  const rise = riseVariants(reduced);

  // Warm the next mobile image once the scene has settled (idle preload).
  useEffect(() => {
    const next = slides[(activeIndex + 1) % slides.length];
    if (!next || isTransitioning) return;
    const timer = window.setTimeout(
      () => preloadHeroImage(next.imageDesktopPath, next.imageMobilePath, "mobile"),
      800,
    );
    return () => window.clearTimeout(timer);
  }, [activeIndex, isTransitioning, slides]);

  if (!active) return null;
  const spec = heroImage(active.imageDesktopPath, active.imageMobilePath, "mobile");
  const sizes = "(max-width: 1023px) 70vw, 420px";

  const onDragEnd = (_: unknown, info: { offset: { x: number } }): void => {
    const offset = info.offset.x;
    if (Math.abs(offset) < SWIPE_INTENT_PX) return;
    const width = dragRef.current?.offsetWidth ?? 0;
    if (width > 0 && Math.abs(offset) >= width * SWIPE_COMMIT_RATIO) {
      if (offset < 0) onNext();
      else onPrev();
    }
  };

  return (
    <div
      data-hero-mobile
      className="page-wrap relative z-[2] flex h-full flex-col pb-8 pt-[calc(var(--header-h)+1.25rem)]"
    >
      {/* Persistent glow layer — its custom property morphs in CSS (0.4s). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[calc(var(--header-h)+3.5rem)] h-[min(92vw,560px)]"
      >
        <div
          data-hero-glow
          className="hero-scene-glow h-full w-full opacity-90"
          style={{ ["--hero-glow" as string]: active.glowHex }}
        />
      </div>

      <motion.div
        ref={dragRef}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        dragMomentum={false}
        onDragEnd={onDragEnd}
        className="relative flex touch-pan-y flex-1 select-none flex-col"
      >
        {/* Row 1: eyebrow (swaps with the scene) + 02 — 05 + pause. */}
        <div className="flex items-center justify-between gap-4">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={active.id}
              initial={{ x: hero.mobile.outX, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -hero.mobile.outX, opacity: 0 }}
              transition={{ duration: reduced ? 0 : duration.quick, ease: ease.tide }}
            >
              <Eyebrow index={pad(activeIndex)} total="06">
                {active.eyebrow}
              </Eyebrow>
            </motion.div>
          </AnimatePresence>
          <HeroCounter
            compact
            activeIndex={activeIndex}
            count={slides.length}
            playPaused={playPaused}
            onTogglePlay={onTogglePlay}
          />
        </div>

        {/* The 4:5 mobile image rises 12px into place, then floats at half amp. */}
        <div className="relative mt-4">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={active.id}
              variants={rise}
              initial="enter"
              animate="center"
              exit="exit"
              className="relative mx-auto w-[min(70vw,420px)]"
              onAnimationComplete={() => onComplete(activeIndex)}
            >
              <motion.div
                animate={reduced ? undefined : { y: [0, hero.mobile.floatAmp] }}
                transition={
                  reduced
                    ? undefined
                    : { duration: hero.mobile.floatDuration, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
                }
              >
                <picture>
                  {spec.avifSrcSet ? <source type="image/avif" srcSet={spec.avifSrcSet} sizes={sizes} /> : null}
                  {spec.webpSrcSet ? <source type="image/webp" srcSet={spec.webpSrcSet} sizes={sizes} /> : null}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={spec.fallback ?? active.imageMobilePath}
                    alt={active.imageAlt}
                    width={840}
                    height={1050}
                    fetchPriority={activeIndex === 0 ? "high" : undefined}
                    loading={activeIndex === 0 ? undefined : "eager"}
                    decoding="async"
                    className="stage aspect-[4/5] w-full object-cover"
                  />
                </picture>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Copy group: out x−24 fade .25s, in x+24 fade .35s (Motion only). */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={active.id}
            variants={scene}
            initial="enter"
            animate="center"
            exit="exit"
            className="relative mt-5"
            onAnimationComplete={() => onComplete(activeIndex)}
          >
            <h2 className="heading-display font-display text-display font-normal text-foam">
              {active.headline.before} <em>{active.headline.italic}</em>
              {active.headline.after}
            </h2>
            <HeroPriceBlock slide={active} variant="line" />
            <p className="mt-3 max-w-[38ch] text-lead text-mist">{firstSentence}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button href={active.ctaPrimary.href} variant="primary" className="w-full justify-center">
                {active.ctaPrimary.label}
              </Button>
              <Button href={active.ctaSecondary.href} variant="outline" className="w-full justify-center">
                {active.ctaSecondary.label}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Below the fold: 5×56px snap thumbs + the active name (mono 10px). */}
      <div className="relative mt-6 border-t border-hairline pt-4">
        <HeroThumbRail compact slides={slides} activeIndex={activeIndex} onSelect={onSelect} onProgress={onProgress} />
      </div>
    </div>
  );
}
