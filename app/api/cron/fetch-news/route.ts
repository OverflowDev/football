import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { hasDatabase } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { getGlobalNews } from "@/lib/mock-data";
import { completeJSON } from "@/lib/openai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ExtractedNews {
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  sentimentScore: number;
  priceImpact: number;
}

/**
 * Runs hourly (Vercel Cron).
 * 1. Fetch football news (NewsAPI in prod, mock layer otherwise)
 * 2. Run each article through OpenAI to extract sentiment + impact
 * 3. Store as NewsItem records linked to players
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const articles = getGlobalNews(10);
  let stored = 0;

  for (const a of articles) {
    const extracted = await completeJSON<ExtractedNews>({
      system:
        "Extract market signal from a football news headline+summary. Output JSON: " +
        "{sentiment:'BULLISH'|'BEARISH'|'NEUTRAL', sentimentScore:number(-10..10), priceImpact:number(percent)}.",
      user: `${a.headline}\n${a.summary}`,
      fallback: {
        sentiment: a.sentiment,
        sentimentScore: a.sentimentScore,
        priceImpact: a.priceImpact,
      },
      maxTokens: 120,
    });

    if (hasDatabase) {
      await prisma.newsItem
        .create({
          data: {
            playerId: a.playerId,
            headline: a.headline,
            summary: a.summary,
            source: a.source,
            url: a.url,
            sentiment: extracted.sentiment,
            sentimentScore: extracted.sentimentScore,
            priceImpact: extracted.priceImpact,
            publishedAt: new Date(a.publishedAt),
          },
        })
        .catch(() => null);
    }
    stored++;
  }

  return NextResponse.json({ ok: true, processed: stored, persisted: hasDatabase });
}
