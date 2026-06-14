"use client";

import { Badge } from "@/components/ui/Badge";
import { useRecentTrades } from "@/hooks/usePlayer";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCurrency, timeAgo } from "@/lib/utils";

/** Recent transactions (last N) by all users for a player. */
export function OrderBook({ playerId }: { playerId: string }) {
  const { data, isLoading } = useRecentTrades(playerId);
  const trades = data?.trades ?? [];

  return (
    <div className="card-surface bg-card">
      <div className="border-b border-white/5 px-4 py-3">
        <h3 className="font-display text-sm font-semibold">Recent Trades</h3>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {isLoading && (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        )}
        {!isLoading &&
          trades.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between px-4 py-2 text-xs hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-2">
                <Badge variant={t.type === "BUY" ? "up" : "down"}>{t.type}</Badge>
                <span className="font-mono text-content">{t.shares}</span>
                <span className="text-content-secondary">@ {formatCurrency(t.pricePerShare)}</span>
              </div>
              <div className="flex items-center gap-2 text-content-secondary">
                {t.isOnChain && <span className="text-primary">⛓</span>}
                <span className="truncate max-w-[80px]">{t.actor}</span>
                <span>{timeAgo(t.createdAt)}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
