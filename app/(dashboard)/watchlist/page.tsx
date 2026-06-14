"use client";

import { useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { PlayerCard } from "@/components/market/PlayerCard";
import { TradeModal } from "@/components/market/TradeModal";
import { useApi } from "@/hooks/useApi";
import type { Player } from "@/types";

export default function WatchlistPage() {
  const { data, isLoading } = useApi<{ players: Player[] }>(["watchlist"], "/api/watchlist");
  const players = data?.players ?? [];
  const [tradePlayer, setTradePlayer] = useState<Player | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Watchlist</h1>
        <p className="text-sm text-content-secondary">Players you're tracking</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : players.length === 0 ? (
        <div className="card-surface bg-card p-12 text-center">
          <Star className="mx-auto h-8 w-8 text-content-secondary" />
          <p className="mt-3 text-sm text-content-secondary">
            Your watchlist is empty. Add players from the market to track them here.
          </p>
          <Link href="/market">
            <Button className="mt-4">Browse market</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {players.map((p) => (
            <div key={p.id} className="space-y-2">
              <PlayerCard player={p} />
              <Button fullWidth size="sm" variant="secondary" onClick={() => setTradePlayer(p)}>
                Quick Trade
              </Button>
            </div>
          ))}
        </div>
      )}

      <TradeModal player={tradePlayer} open={!!tradePlayer} onClose={() => setTradePlayer(null)} />
    </div>
  );
}
