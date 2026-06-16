import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

/**
 * Leaderboard. Ranks traders by return. NOTE: a true on-chain leaderboard
 * needs an indexer over wallet holdings/positions; until that exists this
 * serves a representative demo board.
 */
export async function GET(req: NextRequest) {
  const periodParam = req.nextUrl.searchParams.get("period");
  const period = periodParam === "monthly" || periodParam === "alltime" ? periodParam : "weekly";
  return NextResponse.json({ leaderboard: getLeaderboard(period), period });
}
