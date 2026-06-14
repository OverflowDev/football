import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const periodParam = req.nextUrl.searchParams.get("period");
  const period =
    periodParam === "monthly" || periodParam === "alltime" ? periodParam : "weekly";
  return NextResponse.json({ leaderboard: getLeaderboard(period), period });
}
