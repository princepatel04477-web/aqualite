"use client";

import { useEffect, useRef } from "react";

import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

function channel(name: string, fallback: [number, number, number]): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = raw.split(/[\s,]+/).map(Number);
  const [r, g, b] = parts;
  if (r === undefined || g === undefined || b === undefined || parts.some((part) => Number.isNaN(part))) return fallback;
  return [r, g, b];
}

function rgba(color: [number, number, number], alpha: number): string {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

export function TideField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { reduced, tier } = useMotionPolicy();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ivory = channel("--ivory", [250, 246, 238]);
    const hairline = channel("--hairline", [227, 217, 200]);
    const dpr = Math.min(window.devicePixelRatio || 1, tier === "high" ? 1.5 : 1);
    let raf = 0;
    let running = true;
    let visible = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    visibility.observe(canvas);

    const draw = (time: number) => {
      if (!running) return;
      if (!visible) {
        raf = window.requestAnimationFrame(draw);
        return;
      }
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = rgba(ivory, 1);
      ctx.fillRect(0, 0, w, h);

      if (!reduced && tier !== "low") {
        const t = time / 1000;
        for (let band = 0; band < 4; band += 1) {
          ctx.beginPath();
          const base = h * (0.28 + band * 0.14);
          const amp = (6 + band * 3) * dpr;
          for (let x = 0; x <= w; x += 12 * dpr) {
            const y =
              base +
              Math.sin(x * 0.0028 + t * (0.35 + band * 0.06) + band) * amp +
              Math.sin(x * 0.001 - t * 0.22 + band) * amp * 0.55;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = rgba(hairline, 0.28);
          ctx.lineWidth = dpr;
          ctx.stroke();
        }
      }

      raf = window.requestAnimationFrame(draw);
    };

    raf = window.requestAnimationFrame(draw);
    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      visibility.disconnect();
    };
  }, [reduced, tier]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
