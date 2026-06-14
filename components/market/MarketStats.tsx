"use client";

import { TrendingUp, TrendingDown, Activity, Gauge } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PriceTag } from "@/components/shared/PriceTag";
import { formatCompactCurrency } from "@/lib/utils";
import type { MarketStats as MarketStatsType } from "@/types";

export function MarketStats({ stats }: { stats: MarketStatsType }) {
  const items = [
    {
      label: "Total Market Cap",
      value: formatCompactCurrency(stats.totalMarketCap),
      icon: <Gauge className="h-4 w-4 text-primary" />,
    },
    {
      label: "24h Volume",
      value: formatCompactCurrency(stats.totalVolume24h),
      icon: <Activity className="h-4 w-4 text-primary" />,
    },
    {
      label: "Top Gainer",
      value: stats.topGainer?.symbol ?? "—",
      extra: stats.topGainer ? <PriceTag value={stats.topGainer.priceChangePercent24h} /> : null,
      icon: <TrendingUp className="h-4 w-4 text-up" />,
    },
    {
      label: "Top Loser",
      value: stats.topLoser?.symbol ?? "—",
      extra: stats.topLoser ? <PriceTag value={stats.topLoser.priceChangePercent24h} /> : null,
      icon: <TrendingDown className="h-4 w-4 text-down" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((it) => (
        <Card key={it.label} className="p-4">
          <div className="flex items-center gap-2 text-xs text-content-secondary">
            {it.icon}
            {it.label}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-display text-lg font-semibold">{it.value}</span>
            {it.extra}
          </div>
        </Card>
      ))}
    </div>
  );
}
