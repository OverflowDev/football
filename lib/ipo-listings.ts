// Surfaces listed IPO tokens as tradable players in the spot market.
//
// When the admin lists a finalized IPO token (FootballMarket.listExternalToken),
// the IpoSale row is flagged `listed`. This module reads those rows and
// synthesizes Player objects (with the on-chain token + live price) so they
// flow into the /market grid, the player page, and on-chain spot trading.

import { prisma } from "@/lib/prisma";
import { hasDatabase } from "@/lib/config";
import { arcPublicClient } from "@/lib/onchain";
import { FOOTBALL_MARKET_ABI } from "@/lib/abi";
import { symbolFor, slugify } from "@/lib/mock-data";
import { ipoAvatar } from "@/lib/ipo";
import type { Player, Position } from "@/types";

const MARKET = (process.env.NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS || "") as `0x${string}`;

type ListedRow = {
  saleId: number;
  playerToken: string;
  name: string;
  club: string;
  position: string;
  nat: string;
  listedPrice: number | null;
};

const NOMINAL_SHARES = 1_000_000;

function toPlayer(row: ListedRow, price: number): Player {
  const slug = slugify(row.name);
  const marketCap = Math.round(price * NOMINAL_SHARES);
  return {
    id: `ipo_${row.saleId}`,
    apiFootballId: 900000 + row.saleId,
    name: row.name,
    slug,
    position: (["FWD", "MID", "DEF", "GK"].includes(row.position) ? row.position : "FWD") as Position,
    nationality: row.nat.toUpperCase(),
    nationalityCode: row.nat || "un",
    age: 20,
    club: {
      id: `ipo_club_${row.saleId}`,
      name: row.club || "—",
      shortName: row.club || "—",
      logo: "",
      league: "IPO",
      country: "",
    },
    currentPrice: price,
    previousPrice: price,
    priceChange24h: 0,
    priceChangePercent24h: 0,
    priceChangePercent7d: 0,
    marketCap,
    totalShares: NOMINAL_SHARES,
    sharesAvailable: NOMINAL_SHARES,
    volume24h: 0,
    baseValue: price,
    formRating: 60,
    rumorScore: 0,
    injuryStatus: false,
    performanceIndex: 60,
    imageUrl: ipoAvatar(row.name),
    contractAddress: row.playerToken,
    tokenId: null,
    isActive: true,
    symbol: symbolFor(row.name),
    stats: {
      season: "2024/25",
      matches: 0,
      goals: 0,
      assists: 0,
      minutesPlayed: 0,
      yellowCards: 0,
      redCards: 0,
      rating: 0,
      form: 60,
    },
  };
}

/** Listed IPO tokens as Players (live price from chain, fallback to listedPrice). */
export async function getListedIpoPlayers(): Promise<Player[]> {
  if (!hasDatabase) return [];
  let rows: ListedRow[];
  try {
    rows = (await prisma.ipoSale.findMany({ where: { listed: true } })) as unknown as ListedRow[];
  } catch {
    return [];
  }
  if (rows.length === 0) return [];

  return Promise.all(
    rows.map(async (row) => {
      let price = row.listedPrice ?? 10;
      try {
        const onchain = (await arcPublicClient.readContract({
          address: MARKET,
          abi: FOOTBALL_MARKET_ABI,
          functionName: "getPlayerPrice",
          args: [row.playerToken as `0x${string}`],
        })) as bigint;
        if (onchain > 0n) price = Number(onchain) / 1e6;
      } catch {
        // market unreachable or not listed yet — use stored price
      }
      return toPlayer(row, price);
    })
  );
}
