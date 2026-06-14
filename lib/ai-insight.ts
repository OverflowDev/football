// Deterministic AI-insight generator. Produces a structured AIInsight from a
// player's data, used as the zero-config fallback when OPENAI_API_KEY is
// not set, and as the grounding data injected into the live agents.

import { fpiFairValue } from "@/lib/pricing-engine";
import type { AIInsight, Player } from "@/types";

export function buildInsight(player: Player): AIInsight {
  const fairValue = Math.round(fpiFairValue(player) * 100) / 100;
  const upsidePercent =
    player.currentPrice > 0
      ? Math.round(((fairValue - player.currentPrice) / player.currentPrice) * 10000) / 100
      : 0;

  const verdict: AIInsight["verdict"] =
    upsidePercent > 8 ? "Undervalued" : upsidePercent < -8 ? "Overvalued" : "Fair Value";

  const formTrend: AIInsight["formTrend"] =
    player.formRating >= 66 ? "Rising" : player.formRating <= 40 ? "Declining" : "Stable";

  const transferProbability = Math.min(100, Math.round(player.rumorScore * 1.8));

  const riskRating: AIInsight["riskRating"] =
    player.age < 22 || player.injuryStatus
      ? "High"
      : player.age > 30
        ? "Medium"
        : "Low";

  const recommendation: AIInsight["recommendation"] =
    upsidePercent > 15 && !player.injuryStatus
      ? "STRONG BUY"
      : upsidePercent > 5
        ? "BUY"
        : upsidePercent < -10
          ? "SELL"
          : "HOLD";

  const confidence: AIInsight["confidence"] =
    Math.abs(upsidePercent) > 12 ? "High" : Math.abs(upsidePercent) > 5 ? "Medium" : "Low";

  const keyFactors = [
    `Form rating ${player.formRating.toFixed(0)}/100 (${formTrend.toLowerCase()})`,
    `${player.stats.goals}G / ${player.stats.assists}A across ${player.stats.matches} matches`,
    transferProbability > 40
      ? `Elevated transfer interest (${transferProbability}% probability)`
      : `Stable situation at ${player.club.name}`,
  ];

  const riskFactors = [
    player.injuryStatus ? "Currently flagged as injured" : `Age profile (${player.age})`,
    player.age < 22 ? "Young player — higher price volatility" : "Liquidity depends on float",
    upsidePercent < 0 ? "Trading above modelled fair value" : "Sentiment-driven swings possible",
  ];

  const summary = `${player.name} screens as ${verdict.toLowerCase()} with a modelled fair value of £${fairValue.toFixed(
    2
  )} versus a market price of £${player.currentPrice.toFixed(2)} (${
    upsidePercent >= 0 ? "+" : ""
  }${upsidePercent.toFixed(1)}% upside). Form is ${formTrend.toLowerCase()} and risk is rated ${riskRating.toLowerCase()}. Recommendation: ${recommendation}.`;

  return {
    fairValue,
    currentPrice: player.currentPrice,
    upsidePercent,
    verdict,
    transferProbability,
    formTrend,
    riskRating,
    confidence,
    summary,
    keyFactors,
    riskFactors,
    recommendation,
  };
}
