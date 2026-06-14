import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchPlayers } from "@/lib/data";
import type { Player } from "@/types";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  position: z.enum(["GK", "DEF", "MID", "FWD"]).optional(),
  league: z.string().optional(),
  club: z.string().optional(),
  search: z.string().optional(),
  show: z.enum(["all", "gainers", "losers", "traded"]).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
});

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries())
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const { position, league, club, search, show, minPrice, maxPrice } = parsed.data;

  let players: Player[] = await fetchPlayers();

  if (position) players = players.filter((p) => p.position === position);
  if (league) players = players.filter((p) => p.club.league === league);
  if (club) players = players.filter((p) => p.club.shortName === club || p.club.id === club);
  if (typeof minPrice === "number") players = players.filter((p) => p.currentPrice >= minPrice);
  if (typeof maxPrice === "number") players = players.filter((p) => p.currentPrice <= maxPrice);
  if (search) {
    const q = search.toLowerCase();
    players = players.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.symbol.toLowerCase().includes(q) ||
        p.club.name.toLowerCase().includes(q)
    );
  }
  if (show === "gainers") players = players.filter((p) => p.priceChangePercent24h > 0);
  if (show === "losers") players = players.filter((p) => p.priceChangePercent24h < 0);
  if (show === "traded") players = [...players].sort((a, b) => b.volume24h - a.volume24h);

  return NextResponse.json({ players });
}
