"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { InsightCard } from "@/components/ai/InsightCard";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { usePlayerNews } from "@/hooks/usePlayer";
import { fetcher } from "@/hooks/useApi";
import {
  cn,
  formatCompactNumber,
  formatNumber,
  shortenAddress,
  timeAgo,
} from "@/lib/utils";
import type { AIInsight, Player, Sentiment } from "@/types";

const TABS = ["Stats", "News", "AI Analysis", "On-Chain"] as const;
type Tab = (typeof TABS)[number];

const SENTIMENT_VARIANT: Record<Sentiment, "up" | "down" | "neutral"> = {
  BULLISH: "up",
  BEARISH: "down",
  NEUTRAL: "neutral",
};

export function PlayerTabs({ player }: { player: Player }) {
  const [tab, setTab] = useState<Tab>("Stats");

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-white/5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t ? "text-content" : "text-content-secondary hover:text-content"
            )}
          >
            {t}
            {tab === t && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {tab === "Stats" && <StatsTab player={player} />}
      {tab === "News" && <NewsTab playerId={player.id} />}
      {tab === "AI Analysis" && <AIAnalysisTab player={player} />}
      {tab === "On-Chain" && <OnChainTab player={player} />}
    </div>
  );
}

function StatsTab({ player }: { player: Player }) {
  const s = player.stats;
  const stats = [
    { label: "Matches", value: s.matches },
    { label: "Goals", value: s.goals },
    { label: "Assists", value: s.assists },
    { label: "Minutes", value: formatNumber(s.minutesPlayed) },
    { label: "Avg Rating", value: s.rating.toFixed(2) },
    { label: "Yellow Cards", value: s.yellowCards },
    { label: "Red Cards", value: s.redCards },
    { label: "Age", value: player.age },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((st) => (
          <div key={st.label} className="rounded-lg bg-surface/60 p-3">
            <p className="text-xs text-content-secondary">{st.label}</p>
            <p className="mt-1 font-display text-xl font-bold tabular-nums">{st.value}</p>
          </div>
        ))}
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-content-secondary">Form</span>
          <span className="font-mono">{player.formRating.toFixed(0)}/100</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface">
          <div
            className={cn(
              "h-full rounded-full",
              player.formRating >= 66 ? "bg-up" : player.formRating >= 40 ? "bg-gold" : "bg-down"
            )}
            style={{ width: `${player.formRating}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function NewsTab({ playerId }: { playerId: string }) {
  const { data, isLoading } = usePlayerNews(playerId);
  if (isLoading) return <SkeletonCard />;
  const news = data?.news ?? [];
  return (
    <div className="space-y-3">
      {news.map((n) => (
        <a
          key={n.id}
          href={n.url}
          className="block rounded-lg bg-surface/60 p-4 transition-colors hover:bg-surface"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-content">{n.headline}</p>
            <Badge variant={SENTIMENT_VARIANT[n.sentiment]}>
              {n.sentiment === "BULLISH" ? "Bullish" : n.sentiment === "BEARISH" ? "Bearish" : "Neutral"}
            </Badge>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-content-secondary">{n.summary}</p>
          <p className="mt-2 text-xs text-content-secondary/70">
            {n.source} · {timeAgo(n.publishedAt)} · impact {n.priceImpact > 0 ? "+" : ""}
            {n.priceImpact}%
          </p>
        </a>
      ))}
    </div>
  );
}

function AIAnalysisTab({ player }: { player: Player }) {
  const { data, isLoading } = useQuery({
    queryKey: ["insight", player.id],
    queryFn: () => fetcher<{ insight: AIInsight }>(`/api/ai/insight?playerId=${player.id}`),
  });
  if (isLoading || !data) return <SkeletonCard />;
  return <InsightCard insight={data.insight} />;
}

function OnChainTab({ player }: { player: Player }) {
  if (!player.contractAddress) {
    return (
      <div className="rounded-lg bg-surface/60 p-8 text-center text-sm text-content-secondary">
        This player is not yet tokenized on-chain. Virtual trading only.
      </div>
    );
  }
  const rows = [
    { label: "Token Symbol", value: player.symbol },
    { label: "Contract", value: shortenAddress(player.contractAddress) },
    { label: "Token ID", value: `#${player.tokenId}` },
    { label: "Total Supply", value: formatCompactNumber(player.totalShares) },
    { label: "Circulating", value: formatCompactNumber(player.totalShares - player.sharesAvailable) },
    { label: "Holders", value: formatNumber(1240 + (player.tokenId ?? 0) * 137) },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-lg bg-surface/60 p-3">
            <p className="text-xs text-content-secondary">{r.label}</p>
            <p className="mt-1 font-mono text-sm font-semibold">{r.value}</p>
          </div>
        ))}
      </div>
      <a
        href={`https://testnet.arcscan.app/address/${player.contractAddress}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        View on Arcscan <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
