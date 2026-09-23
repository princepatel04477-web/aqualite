"use client";

import { useEffect, useRef } from "react";

import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

function channel(name: string): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = raw.split(/[\s,]+/).map(Number);
  const [r, g, b] = parts;
  if (r === undefined || g === undefined || b === undefined || parts.some((part) => Number.isNaN(part))) return [7, 9, 11];
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

    const abyss = channel("--abyss");
    const trench = channel("--trench");
    const aqua = channel("--aqua");
    const aquaDeep = channel("--aqua-deep");
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
      ctx.fillStyle = rgba(abyss, 1);
      ctx.fillRect(0, 0, w, h);

      const glow = ctx.createRadialGradient(w * 0.62, h * 0.4, 0, w * 0.62, h * 0.42, w * 0.34);
      glow.addColorStop(0, rgba(aquaDeep, 0.22));
      glow.addColorStop(0.4, rgba(aqua, 0.04));
      glow.addColorStop(1, rgba(abyss, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      if (!reduced && tier !== "low") {
        const t = time / 1000;
        for (let band = 0; band < 6; band += 1) {
          ctx.beginPath();
          const base = h * (0.22 + band * 0.1);
          const amp = (8 + band * 4) * dpr;
          for (let x = 0; x <= w; x += 10 * dpr) {
            const y =
              base +
              Math.sin(x * 0.0032 + t * (0.45 + band * 0.07) + band) * amp +
              Math.sin(x * 0.0011 - t * 0.28 + band) * amp * 0.65;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = rgba(band % 2 === 0 ? aqua : trench, 0.07 + band * 0.012);
          ctx.lineWidth = dpr;
          ctx.stroke();
        }
        for (let ring = 0; ring < 3; ring += 1) {
          const life = (t * 0.12 + ring * 0.33) % 1;
          ctx.beginPath();
          ctx.arc(w * 0.62, h * 0.46, life * w * 0.26, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(aqua, (1 - life) * 0.16);
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
