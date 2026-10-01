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

/** The mobile lead is the first sentence only (H06). */
function firstSentenceOf(lead: string): string {
  const match = lead.match(/^.*?[.!?](?=\s|$)/);
  return (match ? match[0] : lead).trim();
}

const SWIPE_INTENT_PX = 16;
const SWIPE_COMMIT_RATIO = 0.25;

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
 * The <1024px showcase (H06 / R03):
 * - Text-only eyebrow ("MONSOON '26") + single counter ("04 / 05 · Pause")
 * - Transparent shoe cutout on ivory with CSS halo + contact shadow, strictly
 *   above headline, price line, lead (--ink-2) and CTAs
 * - Single thumbnail rail navigation at bottom
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
  const sizes = "(max-width: 1023px) 78vw, 420px";

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
      className="page-wrap relative z-[2] flex h-full flex-col justify-between pb-6 pt-[calc(var(--header-h)+1rem)]"
    >
      <motion.div
        ref={dragRef}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        dragMomentum={false}
        onDragEnd={onDragEnd}
        className="relative flex touch-pan-y flex-1 select-none flex-col"
      >
        {/* Row 1: text-only eyebrow ("MONSOON '26") + 04 / 05 · Pause */}
        <div className="flex items-center justify-between gap-4">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={active.id}
              initial={{ x: hero.mobile.outX, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -hero.mobile.outX, opacity: 0 }}
              transition={{ duration: reduced ? 0 : duration.quick, ease: ease.tide }}
            >
              <Eyebrow className="text-ink-2">
                <span data-hero-eyebrow-text>{active.eyebrow}</span>
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

        {/* Row 2: Dedicated shoe stage on ivory with CSS halo + contact shadow */}
        <div
          data-hero-shoe={activeIndex}
          style={{ ["--hero-glow" as string]: active.glowHex }}
          className="relative my-3 h-[210px] w-full shrink-0"
        >
          <div
            data-hero-glow
            aria-hidden="true"
            className="hero-scene-glow pointer-events-none absolute -inset-4 z-0"
          />
          <div
            aria-hidden="true"
            className="hero-contact-shadow pointer-events-none absolute inset-x-[12%] bottom-1 z-0 h-10"
          />
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={active.id}
              variants={rise}
              initial="enter"
              animate="center"
              exit="exit"
              className="relative z-[1] mx-auto flex h-full w-[min(82vw,340px)] items-center justify-center"
              onAnimationComplete={() => onComplete(activeIndex)}
            >
              <motion.div
                className="flex h-full w-full items-center justify-center"
                animate={reduced ? undefined : { y: [0, 5] }}
                transition={
                  reduced
                    ? undefined
                    : { duration: hero.mobile.floatDuration, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
                }
              >
                <picture className="flex h-full w-full items-center justify-center">
                  {spec.avifSrcSet ? <source type="image/avif" srcSet={spec.avifSrcSet} sizes={sizes} /> : null}
                  {spec.webpSrcSet ? <source type="image/webp" srcSet={spec.webpSrcSet} sizes={sizes} /> : null}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={spec.fallback ?? active.imageMobilePath}
                    alt={active.imageAlt}
                    width={840}
                    height={740}
                    fetchPriority={activeIndex === 0 ? "high" : undefined}
                    loading={activeIndex === 0 ? undefined : "eager"}
                    decoding="async"
                    className="hero-shoe max-h-full max-w-[90%] object-contain"
                  />
                </picture>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Row 3: Copy group strictly below the shoe stage */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={active.id}
            variants={scene}
            initial="enter"
            animate="center"
            exit="exit"
            data-hero-content={activeIndex}
            className="relative mt-2"
            onAnimationComplete={() => onComplete(activeIndex)}
          >
            <h2
              data-hero-headline
              className="heading-display max-w-[11ch] font-display text-[clamp(2.25rem,8.5vw,3.1rem)] font-normal leading-[0.95] text-ink"
            >
              {active.headline.before} <em>{active.headline.italic}</em>
              {active.headline.after}
            </h2>
            <HeroPriceBlock slide={active} variant="line" />
            <p data-hero-lead className="mt-2.5 max-w-[38ch] text-body leading-relaxed text-ink-2">
              {firstSentence}
            </p>
            <div data-hero-ctas className="mt-4 grid grid-cols-2 gap-3">
              <Button
                href={active.ctaPrimary.href}
                variant="primary"
                className="w-full justify-center whitespace-nowrap px-3"
              >
                {active.ctaPrimary.label}
              </Button>
              <Button
                href={active.ctaSecondary.href}
                variant="outline"
                className="w-full justify-center whitespace-nowrap px-3"
              >
                {active.ctaSecondary.label}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Row 4: Single navigation system (5 porcelain thumbs + active red progress line) */}
      <div className="relative mt-5 border-t border-hairline pt-3">
        <HeroThumbRail
          compact
          slides={slides}
          activeIndex={activeIndex}
          onSelect={onSelect}
          onProgress={onProgress}
        />
      </div>
    </div>
  );
}
