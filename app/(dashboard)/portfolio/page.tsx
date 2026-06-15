"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { PortfolioSummary } from "@/components/portfolio/PortfolioSummary";
import { PerformanceChart } from "@/components/portfolio/PerformanceChart";
import { TransactionHistory } from "@/components/portfolio/TransactionHistory";
import { FuturesPositions } from "@/components/portfolio/FuturesPositions";
import { PriceTag } from "@/components/shared/PriceTag";
import { LivePrice } from "@/components/shared/LivePrice";
import { PlayerAvatar } from "@/components/shared/PlayerAvatar";
import { usePortfolio, useTransactions } from "@/hooks/usePortfolio";
import { formatCurrency } from "@/lib/utils";

export default function PortfolioPage() {
  const { data, isLoading } = usePortfolio();
  const { data: txData } = useTransactions();
  const summary = data?.portfolio;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Portfolio</h1>
        <p className="text-sm text-content-secondary">Your holdings, performance and history</p>
      </div>

      {isLoading || !summary ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        <PortfolioSummary summary={summary} />
      )}

      <Card>
        <div className="flex items-center justify-between px-5 pt-5">
          <h3 className="font-display text-sm font-semibold">Portfolio Value</h3>
          <span className="text-xs text-content-secondary">All time</span>
        </div>
        <div className="px-2 pb-3">
          {summary ? (
            <PerformanceChart
              currentValue={summary.totalValue || 1}
              totalPnlPercent={summary.totalPnlPercent}
              days={60}
            />
          ) : (
            <Skeleton className="m-3 h-[280px]" />
          )}
        </div>
      </Card>

      {/* holdings table */}
      <div>
        <h3 className="mb-3 font-display text-sm font-semibold">Holdings</h3>
        {summary && summary.holdings.length === 0 ? (
          <div className="card-surface bg-card p-10 text-center">
            <p className="text-sm text-content-secondary">You don't hold any players yet.</p>
            <Link href="/market">
              <Button className="mt-3">Browse the market</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto card-surface bg-card">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-white/5 text-xs text-content-secondary">
                <tr>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3 text-right">Shares</th>
                  <th className="px-4 py-3 text-right">Avg Buy</th>
                  <th className="px-4 py-3 text-right">Current</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3 text-right">P&L</th>
                  <th className="px-4 py-3 text-right">P&L %</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {summary?.holdings.map((h) => (
                  <tr key={h.player.id} className="border-b border-white/5">
                    <td className="px-4 py-3">
                      <Link href={`/market/${h.player.slug}`} className="flex items-center gap-2">
                        <PlayerAvatar src={h.player.imageUrl} name={h.player.name} size="sm" />
                        <div>
                          <p className="font-medium">{h.player.name}</p>
                          <p className="text-xs text-content-secondary">{h.player.symbol}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{h.shares.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(h.averageBuyPrice)}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      <LivePrice playerId={h.player.id} fallback={h.player.currentPrice} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(h.currentValue)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(h.pnl)}</td>
                    <td className="px-4 py-3 text-right">
                      <PriceTag value={h.pnlPercent} showArrow={false} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/market/${h.player.slug}`}>
                        <Button size="sm" variant="secondary">
                          Trade
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* futures positions */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
          Futures Positions
        </h3>
        <FuturesPositions />
      </div>

      {/* transactions */}
      <div>
        <h3 className="mb-3 font-display text-sm font-semibold">Transaction History</h3>
        <TransactionHistory transactions={txData?.transactions ?? []} />
      </div>
    </div>
  );
}
