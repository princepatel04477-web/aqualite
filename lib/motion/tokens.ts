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
} as const;

export type MotionTokens = typeof motionTokens;
