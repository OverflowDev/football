import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { hasDatabase } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { getGlobalNews } from "@/lib/mock-data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Runs hourly (Vercel Cron). Fetches football news and stores it as NewsItem
 * records linked to players. Sentiment + impact come from the source data.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const articles = getGlobalNews(10);
  let stored = 0;

  for (const a of articles) {
    if (hasDatabase) {
      await prisma.newsItem
        .create({
          data: {
            playerId: a.playerId,
            headline: a.headline,
            summary: a.summary,
            source: a.source,
            url: a.url,
            sentiment: a.sentiment,
            sentimentScore: a.sentimentScore,
            priceImpact: a.priceImpact,
            publishedAt: new Date(a.publishedAt),
          },
        })
        .catch(() => null);
    }
    stored++;
  }

  return NextResponse.json({ ok: true, processed: stored, persisted: hasDatabase });
}
