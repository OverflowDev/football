// IPO ("Initial Player Offering") listings.
//
// LIVE offerings are fully ON-CHAIN via FootballIPO (see lib/onchain-ipo.ts):
// a fixed pool of shares, buyers deposit USDC, the price/token is the clearing
// price set by all demand, and shares are claimed pro-rata after close.
//
// This module provides the off-chain LISTING METADATA only — the Upcoming and
// Recently-Listed rows, plus the static metadata + addresses for the on-chain
// sales.

import { getAllPlayers } from "@/lib/mock-data";
import type { IpoListing, Position } from "@/types";

const IPO_LAUNCH_PRICE = 10; // starting reference price for new listings

// ── on-chain presales (FootballIPO) ───────────────────────────────────
export const FOOTBALL_IPO_ADDRESS = process.env.NEXT_PUBLIC_FOOTBALL_IPO_ADDRESS || "";

export interface OnChainSale {
  saleId: number;
  playerToken: string;
  name: string;
  club: string;
  position: Position;
  nat: string;
}

// Sales opened by scripts/deploy-ipo.js (see deployments.json).
export const ON_CHAIN_SALES: OnChainSale[] = [
  { saleId: 1, playerToken: "0x847FFd0ba93374Fda047cC63dcbED82d71f16738", name: "Rodrigo Mora", club: "FC Porto", position: "FWD", nat: "pt" },
  { saleId: 2, playerToken: "0x885Afcc0c236fb10ffA1Eda220d75403bdCa4f58", name: "Mathys Tel", club: "Tottenham Hotspur", position: "FWD", nat: "fr" },
];

/** True when on-chain presales are configured. */
export const ipoOnChain = !!FOOTBALL_IPO_ADDRESS && ON_CHAIN_SALES.length > 0;

export function ipoAvatar(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&bold=true&size=128`;
}

function daysFromNow(d: number) {
  return new Date(Date.now() + d * 86400000).toISOString();
}

// ── upcoming ──────────────────────────────────────────────────────────
const UPCOMING: { name: string; club: string; position: Position; nat: string; inDays: number }[] = [
  { name: "Estêvão Willian", club: "Chelsea", position: "FWD", nat: "br", inDays: 3 },
  { name: "Kendry Páez", club: "Chelsea", position: "MID", nat: "ec", inDays: 5 },
  { name: "Franco Mastantuono", club: "Real Madrid", position: "MID", nat: "ar", inDays: 8 },
  { name: "Chido Obi", club: "Manchester United", position: "FWD", nat: "dk", inDays: 12 },
];

/** Off-chain listing metadata: Upcoming + Recently Listed. LIVE comes from chain. */
export function getIpos(): IpoListing[] {
  const out: IpoListing[] = [];

  UPCOMING.forEach((u, i) => {
    out.push({
      id: `ipo_up_${i}`,
      name: u.name,
      club: u.club,
      position: u.position,
      nationalityCode: u.nat,
      imageUrl: ipoAvatar(u.name),
      status: "UPCOMING",
      ipoPrice: IPO_LAUNCH_PRICE,
      listingDate: daysFromNow(u.inDays),
    });
  });

  const young = getAllPlayers()
    .filter((p) => p.age <= 21)
    .slice(0, 4);
  young.forEach((p, i) => {
    const gain = Math.round(((p.currentPrice - IPO_LAUNCH_PRICE) / IPO_LAUNCH_PRICE) * 100);
    out.push({
      id: `ipo_recent_${i}`,
      name: p.name,
      club: p.club.shortName,
      position: p.position,
      nationalityCode: p.nationalityCode,
      imageUrl: p.imageUrl,
      status: "RECENT",
      ipoPrice: IPO_LAUNCH_PRICE,
      slug: p.slug,
      currentPrice: p.currentPrice,
      gainPercent: gain,
    });
  });

  return out;
}

export { IPO_LAUNCH_PRICE };
