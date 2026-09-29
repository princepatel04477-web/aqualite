"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type FunnelPoint = {
  key: string;
  label: string;
  sessions: number;
  ofTopBps: number;
  stepBps: number;
};

const COLORS = ["var(--aqua)", "var(--aqua-deep)", "var(--sand)", "var(--red)", "var(--red-deep)"];

/** Session funnel — one bar per step, token palette, table sits beside it. */
export function FunnelBars({ data }: { data: FunnelPoint[] }) {
  return (
    <div className="h-[240px] w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="var(--hairline)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--rule)" }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={132}
            tick={{ fill: "var(--ink)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--linen)" }}
            contentStyle={{
              background: "var(--paper)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-control)",
              fontSize: 12,
            }}
            formatter={(value) => [`${Number(value)} sessions`, "Sessions"]}
          />
          <Bar dataKey="sessions" radius={[0, 4, 4, 0]} isAnimationActive={false} barSize={18}>
            {data.map((row, index) => (
              <Cell key={row.key} fill={COLORS[index % COLORS.length] ?? "var(--red)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
