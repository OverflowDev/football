"use client";

import Link from "next/link";
import { PlayerAvatar } from "@/components/shared/PlayerAvatar";
import { PriceTag } from "@/components/shared/PriceTag";
import { LivePrice } from "@/components/shared/LivePrice";
import { MiniSparkline } from "@/components/market/MiniSparkline";
import { formatCurrency } from "@/lib/utils";
import type { Holding } from "@/types";

export function HoldingCard({ holding }: { holding: Holding }) {
  const { player } = holding;
  return (
    <Link
      href={`/market/${player.slug}`}
      className="flex items-center gap-3 card-surface bg-card p-3 transition-colors hover:border-primary/30"
    >
      <PlayerAvatar src={player.imageUrl} name={player.name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{player.name}</p>
        <p className="text-xs text-content-secondary">
          {holding.shares.toLocaleString()} shares · {player.symbol}
        </p>
      </div>
      <div className="hidden h-8 w-20 sm:block">
        <MiniSparkline playerId={player.id} positive={holding.pnl >= 0} />
      </div>
      <div className="text-right">
        <p className="font-mono text-sm">
          <LivePrice playerId={player.id} fallback={player.currentPrice} />
        </p>
        <PriceTag value={holding.pnlPercent} showArrow={false} />
      </div>
      <div className="hidden text-right md:block">
        <p className="font-mono text-sm font-semibold">{formatCurrency(holding.currentValue)}</p>
        <p className="text-xs text-content-secondary">{formatCurrency(holding.pnl)} P&L</p>
      </div>
    </Link>
  );
}
