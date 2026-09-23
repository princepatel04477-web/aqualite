"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type PerfTier = "low" | "medium" | "high";

type Policy = {
  tier: PerfTier;
  reduced: boolean;
  allowWebGL: boolean;
  allowPinning: boolean;
  allowBlur: boolean;
  allowCursorFX: boolean;
  revealDistance: number;
  setTier: (tier: PerfTier | "auto") => void;
};

const PolicyContext = createContext<Policy | null>(null);

function detectTier(): PerfTier {
  if (typeof window === "undefined") return "medium";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (reduced || nav.connection?.saveData || (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) || navigator.hardwareConcurrency <= 2) {
    return "low";
  }
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse || (nav.deviceMemory !== undefined && nav.deviceMemory <= 4)) return "medium";
  return "high";
}

export function PerfTierProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverride] = useState<PerfTier | "auto">("auto");
  const [reduced, setReduced] = useState(false);
  const [tier, setDetected] = useState<PerfTier>("medium");

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReduced(media.matches);
      setDetected(detectTier());
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const active = override === "auto" ? tier : override;
  const value = useMemo<Policy>(
    () => ({
      tier: active,
      reduced: reduced || active === "low",
      allowWebGL: active === "high" && !reduced,
      allowPinning: active !== "low" && !reduced,
      allowBlur: active === "high" && !reduced,
      allowCursorFX: active === "high" && !reduced,
      revealDistance: active === "low" || reduced ? 4 : 24,
      setTier: setOverride,
    }),
    [active, reduced],
  );

  return <PolicyContext.Provider value={value}>{children}</PolicyContext.Provider>;
}

export function useMotionPolicy(): Policy {
  const value = useContext(PolicyContext);
  if (!value) {
    return {
      tier: "medium",
      reduced: false,
      allowWebGL: false,
      allowPinning: false,
      allowBlur: false,
      allowCursorFX: false,
      revealDistance: 12,
      setTier: () => undefined,
    };
  }
  return value;
}
