"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Candle, PricePoint, TimeRange } from "@/types";

const RANGES: TimeRange[] = ["1H", "4H", "1D", "1W", "1M", "ALL"];

/**
 * TradingView Lightweight-Charts price chart with timeframe + line/candle
 * toggle. Dynamically imports the library so it never runs during SSR.
 */
export function PriceChart({
  playerId,
  positive,
}: {
  playerId: string;
  positive: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<TimeRange>("1D");
  const [mode, setMode] = useState<"line" | "candles">("line");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let chart: import("lightweight-charts").IChartApi | null = null;
    let disposed = false;

    async function render() {
      if (!containerRef.current) return;
      setLoading(true);
      const lw = await import("lightweight-charts");

      const [historyRes, candleRes] = await Promise.all([
        fetch(`/api/players/${playerId}/price-history?range=${range}`).then((r) => r.json()),
        fetch(`/api/players/${playerId}/price-history?range=${range}&candles=1`).then((r) => r.json()),
      ]);
      if (disposed || !containerRef.current) return;

      const history: PricePoint[] = historyRes.history ?? [];
      const candles: Candle[] = candleRes.candles ?? [];

      containerRef.current.innerHTML = "";
      chart = lw.createChart(containerRef.current, {
        layout: {
          background: { color: "transparent" },
          textColor: "#8888aa",
          fontFamily: "var(--font-sora)",
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.03)" },
          horzLines: { color: "rgba(255,255,255,0.03)" },
        },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.06)" },
        timeScale: { borderColor: "rgba(255,255,255,0.06)", timeVisible: true },
        crosshair: { mode: lw.CrosshairMode.Magnet },
        height: containerRef.current.clientHeight || 360,
        autoSize: true,
      });

      const color = positive ? "#22c55e" : "#ef4444";

      if (mode === "line") {
        const series = chart.addAreaSeries({
          lineColor: color,
          topColor: positive ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)",
          bottomColor: "rgba(0,0,0,0)",
          lineWidth: 2,
        });
        series.setData(
          history.map((p) => ({ time: p.time as never, value: p.price }))
        );
      } else {
        const series = chart.addCandlestickSeries({
          upColor: "#22c55e",
          downColor: "#ef4444",
          borderVisible: false,
          wickUpColor: "#22c55e",
          wickDownColor: "#ef4444",
        });
        series.setData(
          candles.map((c) => ({
            time: c.time as never,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        );
      }
      chart.timeScale().fitContent();
      setLoading(false);
    }

    render();
    return () => {
      disposed = true;
      chart?.remove();
    };
  }, [playerId, range, mode, positive]);

  return (
    <div className="card-surface bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-white/10 p-0.5">
          {(["line", "candles"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                mode === m ? "bg-white/10 text-content" : "text-content-secondary"
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-lg border border-white/10 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                range === r ? "bg-primary/20 text-primary" : "text-content-secondary hover:text-content"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="relative h-[360px] w-full">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="skeleton h-full w-full rounded-lg" />
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
