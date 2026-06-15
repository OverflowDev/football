import { NextResponse } from "next/server";
import { getNewsForPlayer, getPlayerById, getPlayerBySlug } from "@/lib/mock-data";
import { hasDatabase } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import type { NewsItem } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const player = getPlayerById(params.id) ?? getPlayerBySlug(params.id);
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  // Prefer real persisted news in production; fall back to the mock generator.
  if (hasDatabase) {
    const rows = await prisma.newsItem
      .findMany({
        where: { playerId: player.id },
        orderBy: { publishedAt: "desc" },
        take: 5,
      })
      .catch(() => []);
    if (rows.length > 0) {
      const news: NewsItem[] = rows.map((r) => ({
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
      return NextResponse.json({ news });
    }
  }

  return NextResponse.json({ news: getNewsForPlayer(player.id, 5) });
}
