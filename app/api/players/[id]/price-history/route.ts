import { NextRequest, NextResponse } from "next/server";
import { getCandles, getPriceHistory, getPlayerById, getPlayerBySlug } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const range = req.nextUrl.searchParams.get("range") || "1D";
  const wantCandles = req.nextUrl.searchParams.get("candles") === "1";

  const player = getPlayerById(params.id) ?? getPlayerBySlug(params.id);
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  if (wantCandles) {
    return NextResponse.json({ candles: getCandles(player.id, range) });
  }
  return NextResponse.json({ history: getPriceHistory(player.id, range) });
}
