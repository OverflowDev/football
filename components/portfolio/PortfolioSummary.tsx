"use client";

import { Wallet, TrendingUp, Coins, Trophy, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PriceTag } from "@/components/shared/PriceTag";
import { formatCurrency } from "@/lib/utils";
import type { PortfolioSummary as Summary } from "@/types";

export function PortfolioSummary({ summary }: { summary: Summary }) {
  const cards = [
    {
      label: "Total Value",
      value: formatCurrency(summary.totalValue),
      sub: <PriceTag value={summary.dayChangePercent} />,
      icon: <Wallet className="h-4 w-4 text-primary" />,
    },
    {
      label: "Total Invested",
      value: formatCurrency(summary.totalInvested),
      sub: <span className="text-xs text-content-secondary">cost basis</span>,
      icon: <Coins className="h-4 w-4 text-primary" />,
    },
    {
      label: "Total P&L",
      value: formatCurrency(summary.totalPnl),
      sub: <PriceTag value={summary.totalPnlPercent} />,
      icon: <TrendingUp className="h-4 w-4 text-up" />,
    },
    {
      label: "Cash Balance",
      value: formatCurrency(summary.cashBalance),
      sub: <span className="text-xs text-content-secondary">available</span>,
      icon: <Coins className="h-4 w-4 text-gold" />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <div className="flex items-center gap-2 text-xs text-content-secondary">
              {c.icon}
              {c.label}
            </div>
            <p className="mt-2 font-display text-2xl font-bold tabular-nums">{c.value}</p>
            <div className="mt-1">{c.sub}</div>
          </Card>
        ))}
      </div>

      {(summary.bestPerformer || summary.worstPerformer) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {summary.bestPerformer && (
            <Card className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-up" />
                <div>
                  <p className="text-xs text-content-secondary">Best Performer</p>
                  <p className="font-medium">{summary.bestPerformer.player.name}</p>
                </div>
              </div>
              <PriceTag value={summary.bestPerformer.pnlPercent} size="md" />
            </Card>
          )}
          {summary.worstPerformer && (
            <Card className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-down" />
                <div>
                  <p className="text-xs text-content-secondary">Worst Performer</p>
                  <p className="font-medium">{summary.worstPerformer.player.name}</p>
                </div>
              </div>
              <PriceTag value={summary.worstPerformer.pnlPercent} size="md" />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
