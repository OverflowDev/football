import { NextRequest, NextResponse } from "next/server";
import { getPlayerById, getPlayerBySlug } from "@/lib/mock-data";
import { buildInsight } from "@/lib/ai-insight";
import { completeJSON } from "@/lib/openai";
import type { AIInsight } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Aggregated AI insight for a player. Mirrors the spec's
 * /api/agents/insights?playerId=… — returns strictly-typed JSON. Uses OpenAI
 * when configured, otherwise the deterministic model in lib/ai-insight.
 */
export async function GET(req: NextRequest) {
  const playerId = req.nextUrl.searchParams.get("playerId") || "";
  const player = getPlayerById(playerId) ?? getPlayerBySlug(playerId);
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const fallback = buildInsight(player);

  const insight = await completeJSON<AIInsight>({
    system:
      "You are a quantitative football player valuation engine for the FPI trading platform. " +
      "Given a player's data, output an AIInsight JSON object with fields: fairValue (number), " +
      "currentPrice (number), upsidePercent (number), verdict ('Undervalued'|'Fair Value'|'Overvalued'), " +
      "transferProbability (0-100), formTrend ('Rising'|'Declining'|'Stable'), riskRating ('Low'|'Medium'|'High'), " +
      "confidence ('High'|'Medium'|'Low'), summary (string), keyFactors (string[]), riskFactors (string[]), " +
      "recommendation ('STRONG BUY'|'BUY'|'HOLD'|'SELL'). Base everything strictly on the injected data.",
    user: JSON.stringify({
      name: player.name,
      club: player.club.name,
      position: player.position,
      age: player.age,
      currentPrice: player.currentPrice,
      baseValue: player.baseValue,
      formRating: player.formRating,
      rumorScore: player.rumorScore,
      injuryStatus: player.injuryStatus,
      stats: player.stats,
      modelledFairValue: fallback.fairValue,
    }),
    fallback,
    maxTokens: 700,
  });

  return NextResponse.json({ insight });
}
