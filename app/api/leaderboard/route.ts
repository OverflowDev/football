import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/mock-data";
import { hasDatabase } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { marketData } from "@/lib/market-data";
import { shortenAddress } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types";

export const dynamic = "force-dynamic";

const STARTING_BALANCE = 10000;

async function dbLeaderboard(): Promise<LeaderboardEntry[]> {
  const [users, players] = await Promise.all([
    prisma.user.findMany({ include: { portfolio: true }, take: 200 }),
    marketData.getPlayers(),
  ]);
  const priceById = new Map(players.map((p) => [p.id, p.currentPrice]));
  const symbolById = new Map(players.map((p) => [p.id, p.symbol]));

  const entries = users
    .map((u) => {
      const cash = Number(u.virtualBalance);
      let holdingsValue = 0;
      let bestValue = 0;
      let bestPick = "—";
      for (const h of u.portfolio) {
        const value = h.shares * (priceById.get(h.playerId) ?? 0);
        holdingsValue += value;
        if (value > bestValue) {
          bestValue = value;
          bestPick = symbolById.get(h.playerId) ?? "—";
        }
      }
      const totalValue = cash + holdingsValue;
      const returnPercent = Math.round(((totalValue - STARTING_BALANCE) / STARTING_BALANCE) * 1000) / 10;
      return {
        rank: 0,
        userId: u.id,
        username: u.username || shortenAddress(u.walletAddress) || "Trader",
        image: u.image ?? `https://i.pravatar.cc/64?u=${u.id}`,
        returnPercent,
        portfolioValue: Math.round(totalValue * 100) / 100,
        bestPick,
        isPremium: false,
        // only rank users who have actually traded
        _active: u.portfolio.length > 0 || cash !== STARTING_BALANCE,
      };
    })
    .filter((e) => e._active)
    .map(({ _active, ...e }) => e);

  entries.sort((a, b) => b.returnPercent - a.returnPercent);
  entries.forEach((e, i) => (e.rank = i + 1));
  return entries;
}

export async function GET(req: NextRequest) {
  const periodParam = req.nextUrl.searchParams.get("period");
  const period = periodParam === "monthly" || periodParam === "alltime" ? periodParam : "weekly";

  if (hasDatabase) {
    try {
      const real = await dbLeaderboard();
      // Until there's a real field of traders, keep the board populated with the
      // demo leaderboard so the page isn't empty.
      if (real.length >= 3) return NextResponse.json({ leaderboard: real, period, source: "db" });
    } catch {
      // fall through to mock
    }
  }

  return NextResponse.json({ leaderboard: getLeaderboard(period), period, source: "demo" });
}
