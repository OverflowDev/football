"use client";

import Link from "next/link";
import { PlayerAvatar } from "@/components/shared/PlayerAvatar";
import { PriceTag } from "@/components/shared/PriceTag";
import { LivePrice } from "@/components/shared/LivePrice";
import type { Player } from "@/types";

function MoverRow({ player }: { player: Player }) {
  return (
    <Link
      href={`/market/${player.slug}`}
      className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.03]"
    >
      <PlayerAvatar src={player.imageUrl} name={player.name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{player.name}</p>
        <p className="text-xs text-content-secondary">{player.symbol}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-sm">
          <LivePrice playerId={player.id} fallback={player.currentPrice} />
        </p>
        <PriceTag value={player.priceChangePercent24h} showArrow={false} />
      </div>
    </Link>
  );
}

export function TopMovers({ players }: { players: Player[] }) {
  const sorted = [...players].sort(
    (a, b) => b.priceChangePercent24h - a.priceChangePercent24h
  );
  const gainers = sorted.slice(0, 5);
  const losers = sorted.slice(-5).reverse();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="card-surface bg-card p-4">
        <h3 className="mb-2 font-display text-sm font-semibold text-up">Top Gainers</h3>
        <div className="space-y-0.5">
          {gainers.map((p) => (
            <MoverRow key={p.id} player={p} />
          ))}
        </div>
      </div>
      <div className="card-surface bg-card p-4">
        <h3 className="mb-2 font-display text-sm font-semibold text-down">Top Losers</h3>
        <div className="space-y-0.5">
          {losers.map((p) => (
            <MoverRow key={p.id} player={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
