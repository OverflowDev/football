"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { MarketStats } from "@/components/market/MarketStats";
import { TopMovers } from "@/components/market/TopMovers";
import { FixturesWidget } from "@/components/market/FixturesWidget";
import { OnChainHoldings } from "@/components/portfolio/OnChainHoldings";
import { useApi } from "@/hooks/useApi";
import { useStore } from "@/store";
import type { MarketStats as MarketStatsType } from "@/types";

export default function DashboardPage() {
  const players = useStore((s) => s.players);
  const { data: statsData } = useApi<{ stats: MarketStatsType }>(["market-stats"], "/api/market/stats");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-content-secondary">Market overview · on-chain trading on Arc</p>
      </div>

      {statsData ? <MarketStats stats={statsData.stats} /> : <Skeleton className="h-24 w-full" />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <TopMovers players={players} />
        </div>
        <div className="lg:col-span-2">
          <FixturesWidget />
        </div>
      </div>

      {/* your on-chain holdings (shown once a wallet is connected + verified) */}
      <OnChainHoldings />
    </div>
  );
}
