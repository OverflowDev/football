"use client";

import { useMemo } from "react";
import { getPriceHistory } from "@/lib/mock-data";

/**
 * Tiny inline SVG sparkline derived deterministically from the player's
 * price history. No external chart lib needed for the small case.
 */
export function MiniSparkline({
  playerId,
  positive,
  width = 120,
  height = 40,
}: {
  playerId: string;
  positive: boolean;
  width?: number;
  height?: number;
}) {
  const points = useMemo(() => {
    const history = getPriceHistory(playerId, "1D").map((p) => p.price);
    if (history.length === 0) return "";
    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min || 1;
    return history
      .map((p, i) => {
        const x = (i / (history.length - 1)) * width;
        const y = height - ((p - min) / range) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [playerId, width, height]);

  const color = positive ? "#22c55e" : "#ef4444";
  const id = `spark-${playerId}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#${id})`} />
    </svg>
  );
}
