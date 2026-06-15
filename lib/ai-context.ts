// Builds the real-data context injected into each AI agent's system prompt.
// Reads players from the active provider (DB in prod) and news from the DB
// when available, so agents reason over production data — not mock data.

import { getGlobalNews } from "@/lib/mock-data";
import { marketData } from "@/lib/market-data";
import { buildInsight } from "@/lib/ai-insight";
import { hasDatabase } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import type { NewsItem } from "@/types";

export async function scoutContext(): Promise<string> {
  const players = await marketData.getPlayers();
  const scored = players
    .map((p) => ({ p, insight: buildInsight(p) }))
    .sort((a, b) => b.insight.upsidePercent - a.insight.upsidePercent)
    .slice(0, 20);

  return scored
    .map(
      ({ p, insight }) =>
        `${p.name} (${p.symbol}, ${p.position}, ${p.club.shortName}, age ${p.age}): price £${p.currentPrice.toFixed(
          2
        )}, fairValue £${insight.fairValue.toFixed(2)}, upside ${insight.upsidePercent.toFixed(
          1
        )}%, form ${p.formRating.toFixed(0)}/100, rumor ${p.rumorScore.toFixed(0)}/50${
          p.injuryStatus ? ", INJURED" : ""
        }, rec ${insight.recommendation}`
    )
    .join("\n");
}

export function valuationContext(): Promise<string> {
  return scoutContext();
}

async function recentNews(limit: number): Promise<NewsItem[]> {
  if (hasDatabase) {
    const rows = await prisma.newsItem
      .findMany({ orderBy: { publishedAt: "desc" }, take: limit })
      .catch(() => []);
    if (rows.length > 0) {
      return rows.map((r) => ({
        id: r.id,
        playerId: r.playerId,
        headline: r.headline,
        summary: r.summary,
        source: r.source ?? "",
        url: r.url ?? "#",
        sentiment: r.sentiment,
        sentimentScore: r.sentimentScore,
        priceImpact: r.priceImpact,
        publishedAt: r.publishedAt.toISOString(),
      }));
    }
  }
  return getGlobalNews(limit);
}

export async function newsContext(): Promise<string> {
  const news = await recentNews(12);
  return news
    .map(
      (n) =>
        `[${n.sentiment}] ${n.headline} — ${n.summary} (source ${n.source}, est. impact ${
          n.priceImpact > 0 ? "+" : ""
        }${n.priceImpact}%)`
    )
    .join("\n");
}

export async function marketSummary(): Promise<string> {
  const players = await marketData.getPlayers();
  const cap = players.reduce((s, p) => s + p.marketCap, 0);
  const gainers = [...players]
    .sort((a, b) => b.priceChangePercent24h - a.priceChangePercent24h)
    .slice(0, 3)
    .map((p) => `${p.symbol} ${p.priceChangePercent24h > 0 ? "+" : ""}${p.priceChangePercent24h}%`);
  const losers = [...players]
    .sort((a, b) => a.priceChangePercent24h - b.priceChangePercent24h)
    .slice(0, 3)
    .map((p) => `${p.symbol} ${p.priceChangePercent24h}%`);
  return `Total market cap £${(cap / 1e9).toFixed(2)}B. Top gainers: ${gainers.join(
    ", "
  )}. Top losers: ${losers.join(", ")}.`;
}
