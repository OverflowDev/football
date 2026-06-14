import { NextResponse } from "next/server";
import { fetchPlayer, fetchPlayerById } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Resolve a player by slug (preferred) or id. */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const player = (await fetchPlayer(params.id)) ?? (await fetchPlayerById(params.id));
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }
  return NextResponse.json({ player });
}
