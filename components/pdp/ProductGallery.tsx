"use client";

import { useRef, useState } from "react";

import { FrameIn } from "@/components/pdp/FrameIn";
import type { CatalogImage } from "@/content/catalog";
import { cn } from "@/lib/cn";

export function ProductGallery({
  images,
  productName,
}: {
  images: CatalogImage[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  const safeImages = images.length > 0 ? images : [];
  const activeImage = safeImages[activeIndex] ?? safeImages[0];

  const scrollToSlide = (idx: number) => {
    setActiveIndex(idx);
    const el = stripRef.current;
    if (!el) return;
    const width = el.clientWidth;
    el.scrollTo({ left: width * idx, behavior: "smooth" });
  };

  return (
    <div>
      {/* Mobile swipeable carousel */}
      <div className="lg:hidden">
        <div
          ref={stripRef}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.clientWidth > 0) {
              const idx = Math.round(el.scrollLeft / el.clientWidth);
              if (idx !== activeIndex && idx >= 0 && idx < safeImages.length) {
                setActiveIndex(idx);
              }
            }
          }}
        >
          {safeImages.map((image, idx) => (
            <button
              key={`${image.src}-${idx}`}
              type="button"
              onClick={() => {
                setActiveIndex(idx);
                setZoomed(true);
              }}
              aria-label={`Zoom ${productName} view ${idx + 1}`}
              className="stage aspect-[4/5] w-full shrink-0 snap-center overflow-hidden bg-porcelain text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.src}
                alt={image.alt}
                data-pdp-image={idx === 0 ? "true" : undefined}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
        {safeImages.length > 1 ? (
          <div className="mt-3 flex items-center justify-center gap-2" role="tablist" aria-label="Gallery images">
            {safeImages.map((image, idx) => (
              <button
                key={`dot-${image.src}-${idx}`}
                type="button"
                role="tab"
                aria-selected={idx === activeIndex}
                aria-label={`View image ${idx + 1}`}
                onClick={() => scrollToSlide(idx)}
                className={cn(
                  "h-2 rounded-pill transition-all duration-quick",
                  idx === activeIndex ? "w-6 bg-aqua" : "w-2 bg-hairline",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Desktop gallery: main stage + thumbnail rail + 2-up detail grid */}
      <div className="hidden lg:block">
        <FrameIn className="stage relative aspect-[4/5] overflow-hidden bg-porcelain">
          {activeImage ? (
            <button
              type="button"
              onClick={() => setZoomed(true)}
              aria-label={`Zoom ${activeImage.alt}`}
              className="group relative block h-full w-full cursor-zoom-in text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImage.src}
                alt={activeImage.alt}
                data-pdp-image="true"
                className="h-full w-full object-cover transition-transform duration-base group-hover:scale-[1.03]"
              />
              <span className="pointer-events-none absolute bottom-3 right-3 rounded-pill border border-hairline bg-abyss/85 px-3 py-1 font-mono text-eyebrow uppercase text-mist">
                Click to zoom
              </span>
            </button>
          ) : null}
        </FrameIn>
        {safeImages.length > 1 ? (
          <div className="mt-3 grid grid-cols-4 gap-3">
            {safeImages.map((image, idx) => (
              <button
                key={`thumb-${image.src}-${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`Show ${image.alt}`}
                aria-current={idx === activeIndex ? "true" : undefined}
                className={cn(
                  "stage aspect-[4/5] overflow-hidden border bg-porcelain transition-colors duration-quick",
                  idx === activeIndex ? "border-aqua" : "border-hairline opacity-80 hover:opacity-100",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Lightbox zoom modal */}
      {zoomed && activeImage ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} zoomed image`}
          className="fixed inset-0 z-modal flex items-center justify-center bg-abyss/95 p-4 backdrop-blur-md"
          onClick={() => setZoomed(false)}
        >
          <div
            className="relative max-h-[90dvh] max-w-4xl overflow-hidden border border-hairline bg-porcelain"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomed(false)}
              aria-label="Close zoom"
              className="absolute right-4 top-4 z-10 rounded-pill border border-hairline bg-abyss px-3 py-1.5 font-mono text-eyebrow uppercase text-foam"
            >
              Close ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImage.src}
              alt={activeImage.alt}
              className="max-h-[82dvh] w-auto object-contain"
            />
            {safeImages.length > 1 ? (
              <div className="flex items-center justify-between border-t border-hairline bg-abyss px-4 py-3 font-mono text-eyebrow uppercase">
                <button
                  type="button"
                  onClick={() => setActiveIndex((prev) => (prev - 1 + safeImages.length) % safeImages.length)}
                  className="text-foam hover:text-aqua"
                >
                  ← Previous
                </button>
                <span className="text-mist">
                  {activeIndex + 1} / {safeImages.length}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveIndex((prev) => (prev + 1) % safeImages.length)}
                  className="text-foam hover:text-aqua"
                >
                  Next →
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
