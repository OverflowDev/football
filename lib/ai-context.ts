// Builds the real-data context strings injected into each AI agent's system
// prompt so responses are grounded in current platform data, not the model's
// general knowledge.

import { getAllPlayers, getGlobalNews } from "@/lib/mock-data";
import { buildInsight } from "@/lib/ai-insight";

export function scoutContext(): string {
  const players = getAllPlayers();
  const scored = players
    .map((p) => ({ p, insight: buildInsight(p) }))
    .sort((a, b) => b.insight.upsidePercent - a.insight.upsidePercent)
    .slice(0, 20);

  const lines = scored.map(
    ({ p, insight }) =>
      `${p.name} (${p.symbol}, ${p.position}, ${p.club.shortName}, age ${p.age}): price £${p.currentPrice.toFixed(
        2
      )}, fairValue £${insight.fairValue.toFixed(2)}, upside ${insight.upsidePercent.toFixed(
        1
      )}%, form ${p.formRating.toFixed(0)}/100, rumor ${p.rumorScore.toFixed(
        0
      )}/50${p.injuryStatus ? ", INJURED" : ""}, rec ${insight.recommendation}`
  );
  return lines.join("\n");
}

export function valuationContext(): string {
  return scoutContext();
}

export function newsContext(): string {
  const news = getGlobalNews(12);
  return news
    .map(
      (n) =>
        `[${n.sentiment}] ${n.headline} — ${n.summary} (source ${n.source}, est. impact ${
          n.priceImpact > 0 ? "+" : ""
        }${n.priceImpact}%)`
    )
    .join("\n");
}

export function marketSummary(): string {
  const players = getAllPlayers();
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
