"use client";

import { useState } from "react";
import { Trophy, Crown } from "lucide-react";
import { PlayerAvatar } from "@/components/shared/PlayerAvatar";
import { PriceTag } from "@/components/shared/PriceTag";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { cn, formatCurrency } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types";

const PERIODS = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "alltime", label: "All-Time" },
] as const;

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("weekly");
  const { data, isLoading } = useApi<{ leaderboard: LeaderboardEntry[] }>(
    ["leaderboard", period],
    `/api/leaderboard?period=${period}`
  );
  const entries = data?.leaderboard ?? [];
  const podium = entries.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Leaderboard</h1>
          <p className="text-sm text-content-secondary">Top traders by portfolio return</p>
        </div>
        <div className="inline-flex rounded-lg border border-white/10 p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                period === p.key ? "bg-primary/20 text-primary" : "text-content-secondary"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* podium */}
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {podium.map((e, i) => (
            <div
              key={e.userId}
              className={cn(
                "card-surface flex flex-col items-center gap-2 p-5 text-center",
                i === 0 ? "border-gold/30 bg-gradient-to-b from-gold/10 to-card" : "bg-card"
              )}
            >
              <div className="relative">
                <PlayerAvatar src={e.image} name={e.username} size="lg" />
                {i === 0 && (
                  <Crown className="absolute -right-1 -top-2 h-5 w-5 rotate-12 text-gold" />
                )}
              </div>
              <p className="text-sm font-semibold">{e.username}</p>
              <PriceTag value={e.returnPercent} size="md" />
              <p className="text-xs text-content-secondary">{formatCurrency(e.portfolioValue)}</p>
            </div>
          ))}
        </div>
      )}

      {/* full table */}
      <div className="overflow-x-auto card-surface bg-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-white/5 text-xs text-content-secondary">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Trader</th>
              <th className="px-4 py-3 text-right">Return</th>
              <th className="px-4 py-3 text-right">Value</th>
              <th className="px-4 py-3 text-right">Best Pick</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-4 py-2">
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              : entries.map((e) => (
                  <tr key={e.userId} className="border-b border-white/5">
                    <td className="px-4 py-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/5 font-mono text-xs">
                        {e.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <PlayerAvatar src={e.image} name={e.username} size="sm" />
                        <span className="font-medium">{e.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PriceTag value={e.returnPercent} showArrow={false} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(e.portfolioValue)}</td>
                    <td className="px-4 py-3 text-right font-mono text-content-secondary">{e.bestPick}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
