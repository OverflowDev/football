import { NextResponse } from "next/server";
import { getPlayerById, getPlayerBySlug, getRecentTrades } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const player = getPlayerById(params.id) ?? getPlayerBySlug(params.id);
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }
  return NextResponse.json({ trades: getRecentTrades(player.id, 12) });
}
