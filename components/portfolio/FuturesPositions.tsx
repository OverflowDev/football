"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PlayerAvatar } from "@/components/shared/PlayerAvatar";
import { PriceTag } from "@/components/shared/PriceTag";
import { useCloseFuture, useFuturesPositions } from "@/hooks/useFutures";
import { cn, formatCurrency } from "@/lib/utils";

export function FuturesPositions() {
  const { data, isLoading } = useFuturesPositions();
  const { close, closingId } = useCloseFuture();
  const positions = data?.positions ?? [];

  if (!isLoading && positions.length === 0) {
    return (
      <div className="card-surface bg-card p-8 text-center text-sm text-content-secondary">
        No open futures positions.{" "}
        <Link href="/market" className="text-primary hover:underline">
          Open a leveraged position
        </Link>{" "}
        from any player page.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto card-surface bg-card">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="border-b border-white/5 text-xs text-content-secondary">
          <tr>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3">Side</th>
            <th className="px-4 py-3 text-right">Size</th>
            <th className="px-4 py-3 text-right">Entry</th>
            <th className="px-4 py-3 text-right">Mark</th>
            <th className="px-4 py-3 text-right">Liq.</th>
            <th className="px-4 py-3 text-right">Margin</th>
            <th className="px-4 py-3 text-right">P&L</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => (
            <tr key={p.id} className="border-b border-white/5">
              <td className="px-4 py-3">
                <Link href={`/market/${p.player.slug}`} className="flex items-center gap-2">
                  <PlayerAvatar src={p.player.imageUrl} name={p.player.name} size="sm" />
                  <div>
                    <p className="font-medium">{p.player.name}</p>
                    <p className="text-xs text-content-secondary">{p.player.symbol}</p>
                  </div>
                </Link>
              </td>
              <td className="px-4 py-3">
                <Badge variant={p.side === "LONG" ? "up" : "down"}>
                  <Zap className="h-3 w-3" /> {p.side} {p.leverage}x
                </Badge>
              </td>
              <td className="px-4 py-3 text-right font-mono">{p.size.toLocaleString()}</td>
              <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.entryPrice)}</td>
              <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.markPrice)}</td>
              <td className="px-4 py-3 text-right font-mono text-down">{formatCurrency(p.liquidationPrice)}</td>
              <td className="px-4 py-3 text-right font-mono text-content-secondary">{formatCurrency(p.margin)}</td>
              <td className="px-4 py-3 text-right">
                <div className={cn("font-mono", p.unrealizedPnl >= 0 ? "text-up" : "text-down")}>
                  {formatCurrency(p.unrealizedPnl)}
                </div>
                <PriceTag value={p.pnlPercent} showArrow={false} />
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  size="sm"
                  variant="secondary"
                  loading={closingId === p.id}
                  onClick={() => close(p.id)}
                >
                  Close
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
