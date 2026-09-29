"use client";

import dynamic from "next/dynamic";

const loading = (
  <div className="flex h-[280px] w-full items-center justify-center">
    <div className="h-40 w-full max-w-[520px] animate-pulse rounded-hub bg-linen" />
  </div>
);

/** Charts are client-only (recharts) — the pages always ship real tables too. */
export const SalesAreaChart = dynamic(
  () => import("./SalesAreaChart").then((module) => module.SalesAreaChart),
  { ssr: false, loading: () => loading },
);

export const FunnelBars = dynamic(
  () => import("./FunnelBars").then((module) => module.FunnelBars),
  { ssr: false, loading: () => loading },
);
