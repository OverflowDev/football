import { NextResponse } from "next/server";
import { getOpenAI, OPENAI_MODEL } from "@/lib/openai";
import { marketSummary, newsContext } from "@/lib/ai-context";
import { marketData } from "@/lib/market-data";

export const dynamic = "force-dynamic";

/** Auto-generated morning market summary for the dashboard. */
export async function GET() {
  const players = await marketData.getPlayers();
  const topGainer = [...players].sort(
    (a, b) => b.priceChangePercent24h - a.priceChangePercent24h
  )[0];
  const topLoser = [...players].sort(
    (a, b) => a.priceChangePercent24h - b.priceChangePercent24h
  )[0];

  const fallback = `Good morning. ${await marketSummary()} ${topGainer.name} (${topGainer.symbol}) leads the board at ${topGainer.priceChangePercent24h > 0 ? "+" : ""}${topGainer.priceChangePercent24h}%, while ${topLoser.name} (${topLoser.symbol}) lags at ${topLoser.priceChangePercent24h}%. Transfer rumors and weekend form are the main price drivers today — watch undervalued names with rising form.`;

  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json({ briefing: fallback });
  }

  try {
    const res = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content:
            "You are the FPI News Agent. Write a punchy 3-4 sentence morning market briefing for football-player-stock traders. Ground it in the injected data.",
        },
        {
          role: "user",
          content: `Market: ${await marketSummary()}\n\nNews:\n${await newsContext()}`,
        },
      ],
    });
    const text = res.choices[0]?.message?.content?.trim() || fallback;
    return NextResponse.json({ briefing: text });
  } catch {
    return NextResponse.json({ briefing: fallback });
  }
}
