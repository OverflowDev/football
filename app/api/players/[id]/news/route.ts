import { NextResponse } from "next/server";
import { getNewsForPlayer, getPlayerById, getPlayerBySlug } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const player = getPlayerById(params.id) ?? getPlayerBySlug(params.id);
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }
  return NextResponse.json({ news: getNewsForPlayer(player.id, 5) });
}
