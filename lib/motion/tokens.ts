export const ease = {
  tide: [0.22, 1, 0.36, 1],
  surface: [0.65, 0, 0.35, 1],
  drop: [0.34, 1.56, 0.64, 1],
} as const;

export const gsapEase = {
  tide: "power3.out",
  surface: "power2.inOut",
  drop: "back.out(1.6)",
  linear: "none",
  drift: "sine.inOut",
} as const;

export const duration = {
  instant: 0.12,
  quick: 0.24,
  base: 0.45,
  slow: 0.8,
  cinematic: 1.2,
} as const;

export const stagger = {
  tight: 0.03,
  base: 0.06,
  loose: 0.12,
} as const;

/**
 * Hero scene-change choreography (H04). Seconds, relative to the transition
 * timeline (total 1.1–1.3s). GSAP owns this sequence end to end.
 */
export const hero = {
  sink: 0.55,
  headlineOut: 0.4,
  headlineOutStagger: 0.04,
  metaOut: 0.3,
  metaOutOffset: 0.05,
  wave: 0.9,
  waveOffset: 0.15,
  crossfadeMedium: 0.5,
  crossfadeReduced: 0.25,
  glow: 0.9,
  glowOffset: 0.2,
  eyebrowOffset: 0.35,
  eyebrow: 0.4,
  surface: 0.8,
  surfaceOffset: 0.45,
  headlineIn: 0.7,
  headlineInStagger: 0.06,
  headlineInOffset: 0.55,
  emShift: 0.2,
  leadIn: 0.5,
  leadInOffset: 0.75,
  ctasIn: 0.45,
  ctasInOffset: 0.85,
  rippleDrift: 1,
  sinkY: 8, // % of shoe height
  sinkRotate: 4, // deg
  sinkScale: 0.94,
  surfaceY: 12, // %
  surfaceRotate: -6, // deg
  surfaceScale: 0.9,
  waveAmplitude: 0.03, // of frame width (≈3vw)
  wavePoints: 18,
  driftX: 2, // % ripple drift

  /**
   * H06 mobile scene-change (Motion-only tier): out x±24 fade 0.25s, in
   * x±24 fade 0.35s, shoe rise 12px, half-amp Buoyancy idle float, and the
   * glow custom-property morph handled purely in CSS (--dur-glow).
   */
  mobile: {
    outX: 24, // px
    outDuration: 0.25, // s
    inDuration: 0.35, // s
    riseY: 12, // px
    floatAmp: 2.5, // px — half of Buoyancy's medium tier
    floatDuration: 2.1, // s — Buoyancy's period
    glowMs: 400, // ms — keep in sync with tokens.css --dur-glow
  },
} as const;

export const spring = {
  soft: { stiffness: 170, damping: 26 },
  snappy: { stiffness: 420, damping: 32 },
  buoyant: { stiffness: 120, damping: 12, mass: 0.8 },
} as const;

export const distance = {
  revealDesktop: 24,
  revealMobile: 12,
  reducedMax: 4,
} as const;

export const motionTokens = {
  ease,
  gsapEase,
  duration,
  stagger,
  spring,
  distance,
  hero,
} as const;

export type MotionTokens = typeof motionTokens;
