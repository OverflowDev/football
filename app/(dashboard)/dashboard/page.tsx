"use client";

import Link from "next/link";
import { Wallet, Coins, TrendingUp, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { PriceTag } from "@/components/shared/PriceTag";
import { PerformanceChart } from "@/components/portfolio/PerformanceChart";
import { HoldingCard } from "@/components/portfolio/HoldingCard";
import { TopMovers } from "@/components/market/TopMovers";
import { DailyBriefing } from "@/components/ai/DailyBriefing";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useStore } from "@/store";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const { data, isLoading } = usePortfolio();
  const players = useStore((s) => s.players);
  const summary = data?.portfolio;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-content-secondary">Your FPI trading overview</p>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Wallet className="h-4 w-4 text-primary" />}
          label="Portfolio Value"
          value={summary ? formatCurrency(summary.totalValue) : undefined}
          sub={summary ? <PriceTag value={summary.dayChangePercent} /> : null}
          loading={isLoading}
        />
        <StatCard
          icon={<Coins className="h-4 w-4 text-gold" />}
          label="Virtual Balance"
          value={summary ? formatCurrency(summary.cashBalance) : undefined}
          sub={<span className="text-xs text-content-secondary">available to trade</span>}
          loading={isLoading}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-up" />}
          label="Total P&L"
          value={summary ? formatCurrency(summary.totalPnl) : undefined}
          sub={summary ? <PriceTag value={summary.totalPnlPercent} /> : null}
          loading={isLoading}
        />
        <StatCard
          icon={<Users className="h-4 w-4 text-primary" />}
          label="Players Held"
          value={summary ? String(summary.holdingsCount) : undefined}
          sub={<span className="text-xs text-content-secondary">in portfolio</span>}
          loading={isLoading}
        />
      </div>

      {/* middle: performance + movers */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between px-5 pt-5">
            <h3 className="font-display text-sm font-semibold">Portfolio Performance</h3>
            <span className="text-xs text-content-secondary">Last 30 days</span>
          </div>
          <div className="px-2 pb-3">
            {summary ? (
              <PerformanceChart
                currentValue={summary.totalValue || 1}
                totalPnlPercent={summary.totalPnlPercent}
              />
            ) : (
              <Skeleton className="m-3 h-[280px]" />
            )}
          </div>
        </Card>
        <div className="lg:col-span-2">
          <TopMovers players={players} />
        </div>
      </div>

      {/* bottom: holdings + briefing */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold">Your Holdings</h3>
            <Link href="/portfolio" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            {summary?.holdings.slice(0, 5).map((h) => (
              <HoldingCard key={h.player.id} holding={h} />
            ))}
            {summary && summary.holdings.length === 0 && (
              <p className="py-6 text-center text-sm text-content-secondary">
                No holdings yet —{" "}
                <Link href="/market" className="text-primary hover:underline">
                  start trading
                </Link>
                .
              </p>
            )}
          </div>
        </Card>
        <DailyBriefing />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  sub: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-content-secondary">
        {icon}
        {label}
      </div>
      {loading || value === undefined ? (
        <Skeleton className="mt-2 h-7 w-24" />
      ) : (
        <p className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</p>
      )}
      <div className="mt-1">{sub}</div>
    </Card>
  );
}
