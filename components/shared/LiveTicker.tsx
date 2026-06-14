"use client";

import Link from "next/link";
import { useStore } from "@/store";
import { cn, formatCurrency, formatPercent, priceDirection } from "@/lib/utils";
import type { Player } from "@/types";

/**
 * Horizontal auto-scrolling price ticker. Pulls from the cached players in the
 * store and overlays realtime prices. Duplicated once for a seamless marquee.
 */
export function LiveTicker({ className }: { className?: string }) {
  const players = useStore((s) => s.players);
  const livePrices = useStore((s) => s.livePrices);

  if (players.length === 0) return null;

  const items = players.slice(0, 30);

  const render = (p: Player, key: string) => {
    const live = livePrices[p.id];
    const price = live?.price ?? p.currentPrice;
    const change = live?.changePercent ?? p.priceChangePercent24h;
    const dir = priceDirection(change);
    return (
      <Link
        key={key}
        href={`/market/${p.slug}`}
        className="flex shrink-0 items-center gap-2 px-4 py-2 hover:bg-white/5"
      >
        <span className="font-mono text-xs font-semibold text-content-secondary">
          {p.symbol}
        </span>
        <span className="font-mono text-xs tabular-nums text-content">
          {formatCurrency(price)}
        </span>
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
      </Link>
    );
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden border-t border-white/5 bg-surface/80 backdrop-blur",
        className
      )}
    >
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        {items.map((p) => render(p, `a-${p.id}`))}
        {items.map((p) => render(p, `b-${p.id}`))}
      </div>
    </div>
  );
}
