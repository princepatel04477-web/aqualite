"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatINR } from "@/lib/money";

export type SalesPoint = {
  day: string;
  salesPaise: number;
  previousPaise: number;
};

/** Sales over the range vs the previous period — token colours only. */
export function SalesAreaChart({ data }: { data: SalesPoint[] }) {
  const points = data.map((row) => ({
    ...row,
    sales: row.salesPaise / 100,
    previous: row.previousPaise / 100,
  }));
  return (
    <div className="h-[280px] w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--red)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--red)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--hairline)" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--rule)" }}
            minTickGap={18}
          />
          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(value: number) => `${Math.round(value / 100) / 10}k`}
          />
          <Tooltip
            cursor={{ stroke: "var(--rule)" }}
            contentStyle={{
              background: "var(--paper)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-control)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
            }}
            formatter={(value, name) => [
              formatINR(Math.round(Number(value) * 100)),
              name === "sales" ? "This period" : "Previous",
            ]}
            labelFormatter={(label) => `IST ${String(label)}`}
          />
          <Area
            type="monotone"
            dataKey="previous"
            stroke="var(--muted)"
            strokeDasharray="4 4"
            strokeWidth={1.25}
            fill="transparent"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="sales"
            stroke="var(--red)"
            strokeWidth={2}
            fill="url(#salesFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
