"use client";

import { getAllPlayers } from "@/lib/mock-data";
import { cn, formatCurrency, formatPercent, priceDirection } from "@/lib/utils";

/** Edge-faded, auto-scrolling price marquee for the landing page. */
export function LandingTicker() {
  const players = getAllPlayers().slice(0, 18);

  const chip = (id: string, symbol: string, price: number, change: number, key: string) => {
    const dir = priceDirection(change);
    return (
      <div key={key} className="flex shrink-0 items-center gap-2 px-5 py-2.5">
        <span className="font-mono text-xs font-semibold text-content-secondary">{symbol}</span>
        <span className="font-mono text-xs tabular-nums">{formatCurrency(price)}</span>
        <span
          className={cn(
            "font-mono text-xs tabular-nums",
            dir === "up" && "text-up",
            dir === "down" && "text-down",
            dir === "flat" && "text-content-secondary"
          )}
        >
          {formatPercent(change)}
        </span>
      </div>
    );
  };

  return (
    <div className="relative overflow-hidden border-y border-white/5 bg-surface/40">
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
      <div className="flex w-max animate-marquee">
        {players.map((p) => chip(p.id, p.symbol, p.currentPrice, p.priceChangePercent24h, `a-${p.id}`))}
        {players.map((p) => chip(p.id, p.symbol, p.currentPrice, p.priceChangePercent24h, `b-${p.id}`))}
      </div>
    </div>
  );
}
