"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

/**
 * Portfolio value over time. Synthesises a smooth equity curve ending at the
 * current total value (deterministic so it's stable between renders).
 */
export function PerformanceChart({
  currentValue,
  totalPnlPercent,
  days = 30,
  height = 280,
}: {
  currentValue: number;
  totalPnlPercent: number;
  days?: number;
  height?: number;
}) {
  const data = useMemo(() => {
    const start = currentValue / (1 + totalPnlPercent / 100);
    const out: { date: string; value: number }[] = [];
    let v = start;
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const seed = Math.sin(i * 12.9898) * 43758.5453;
      const noise = (seed - Math.floor(seed) - 0.5) * (currentValue * 0.02);
      const target = start + ((currentValue - start) * (days - 1 - i)) / (days - 1);
      v = target + noise;
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      out.push({
        date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        value: Math.max(0, Math.round(v * 100) / 100),
      });
    }
    out[out.length - 1].value = currentValue;
    return out;
  }, [currentValue, totalPnlPercent, days]);

  const positive = totalPnlPercent >= 0;
  const color = positive ? "#22c55e" : "#ef4444";

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#8888aa" }}
            tickLine={false}
            axisLine={false}
            minTickGap={32}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#8888aa" }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v) => `£${(v / 1000).toFixed(1)}k`}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "#1a1a24",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "#8888aa" }}
            formatter={(value: number) => [formatCurrency(value), "Value"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="url(#portfolioGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
