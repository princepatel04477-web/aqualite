import { gsap } from "@/lib/motion/gsap";

import { hero } from "@/lib/motion/tokens";

export const WAVE_CLIP_ID = "hero-wave-clip";

/**
 * The <clipPath> def the wave wipe writes into. Render once per hero:
 * objectBoundingBox units keep the path resolution-independent.
 */
export function WaveClipDef(): React.ReactElement {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" className="absolute">
      <defs>
        <clipPath id={WAVE_CLIP_ID} clipPathUnits="objectBoundingBox">
          <path d="M0,0 L0,0 Z" />
        </clipPath>
      </defs>
    </svg>
  );
}

function buildWavePath(progress: number, amplitude: number, points: number): string {
  const clamped = Math.max(0, Math.min(1, progress));
  // The edge travels from -amplitude (fully hidden) to 1 + amplitude (fully shown).
  const edge = -amplitude + clamped * (1 + amplitude * 2);
  const coords: string[] = [];
  for (let i = 0; i <= points; i += 1) {
    const y = i / points;
    const x = edge + amplitude * Math.sin(y * Math.PI * 2);
    coords.push(`L${x.toFixed(4)},${y.toFixed(4)}`);
  }
  return `M${(edge + amplitude).toFixed(4)},0 ${coords.join(" ")} L1.2,1 L1.2,0 Z`;
}

/**
 * The background wave wipe (H04 t=0.15). One tweened `progress` number
 * rebuilds a sine-edged path each tick; the incoming backdrop is revealed
 * through it while the outgoing background stays underneath.
 */
export function waveWipe(incoming: HTMLElement, duration: number): { tween: gsap.core.Tween; reset: () => void } {
  const path = document.querySelector<SVGPathElement>(`#${WAVE_CLIP_ID} path`);
  const proxy = { p: 0 };
  gsap.set(incoming, { clipPath: `url(#${WAVE_CLIP_ID})`, WebkitClipPath: `url(#${WAVE_CLIP_ID})` });
  const apply = (value: number): void => {
    if (path) path.setAttribute("d", buildWavePath(value, hero.waveAmplitude, hero.wavePoints));
  };
  apply(0);
  const tween = gsap.to(proxy, {
    p: 1,
    duration,
    ease: "power3.inOut",
    onUpdate: () => apply(proxy.p),
  });
  return {
    tween,
    reset: () => {
      apply(1);
      incoming.style.clipPath = "";
      incoming.style.removeProperty("-webkit-clip-path");
    },
  };
}
