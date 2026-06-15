// IPO ("Initial Player Offering") listings. Deterministic demo data:
//  - UPCOMING: prospects listing soon (follow / get notified)
//  - LIVE: currently in their offering window (reserve shares, progress bar)
//  - RECENT: just entered the market — links to the tradable player
//
// Newly listed players use a fixed launch price; the market reprices from there.

import { getAllPlayers } from "@/lib/mock-data";
import type { IpoListing, Position } from "@/types";

const IPO_LAUNCH_PRICE = 10; // every new player IPOs at the same fair-launch price

function avatar(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&bold=true&size=128`;
}

function daysFromNow(d: number) {
  return new Date(Date.now() + d * 86400000).toISOString();
}

const UPCOMING: { name: string; club: string; position: Position; nat: string; inDays: number }[] = [
  { name: "Estêvão Willian", club: "Chelsea", position: "FWD", nat: "br", inDays: 3 },
  { name: "Kendry Páez", club: "Chelsea", position: "MID", nat: "ec", inDays: 5 },
  { name: "Franco Mastantuono", club: "Real Madrid", position: "MID", nat: "ar", inDays: 8 },
  { name: "Chido Obi", club: "Manchester United", position: "FWD", nat: "dk", inDays: 12 },
];

const LIVE: { name: string; club: string; position: Position; nat: string; total: number; sold: number; endsInDays: number }[] = [
  { name: "Rodrigo Mora", club: "FC Porto", position: "FWD", nat: "pt", total: 1_000_000, sold: 652_000, endsInDays: 2 },
  { name: "Mathys Tel", club: "Tottenham Hotspur", position: "FWD", nat: "fr", total: 1_000_000, sold: 318_000, endsInDays: 4 },
];

export function getIpos(): IpoListing[] {
  const out: IpoListing[] = [];

  UPCOMING.forEach((u, i) => {
    out.push({
      id: `ipo_up_${i}`,
      name: u.name,
      club: u.club,
      position: u.position,
      nationalityCode: u.nat,
      imageUrl: avatar(u.name),
      status: "UPCOMING",
      ipoPrice: IPO_LAUNCH_PRICE,
      listingDate: daysFromNow(u.inDays),
    });
  });

  LIVE.forEach((l, i) => {
    out.push({
      id: `ipo_live_${i}`,
      name: l.name,
      club: l.club,
      position: l.position,
      nationalityCode: l.nat,
      imageUrl: avatar(l.name),
      status: "LIVE",
      ipoPrice: IPO_LAUNCH_PRICE,
      sharesTotal: l.total,
      sharesSold: l.sold,
      endsAt: daysFromNow(l.endsInDays),
    });
  });

  // Recently listed → a few of our youngest tradable players, shown as IPO graduates.
  const young = getAllPlayers()
    .filter((p) => p.age <= 21)
    .slice(0, 4);
  young.forEach((p, i) => {
    const ipoPrice = IPO_LAUNCH_PRICE;
    const gain = Math.round(((p.currentPrice - ipoPrice) / ipoPrice) * 100);
    out.push({
      id: `ipo_recent_${i}`,
      name: p.name,
      club: p.club.shortName,
      position: p.position,
      nationalityCode: p.nationalityCode,
      imageUrl: p.imageUrl,
      status: "RECENT",
      ipoPrice,
      slug: p.slug,
      currentPrice: p.currentPrice,
      gainPercent: gain,
    });
  });

  return out;
}

export { IPO_LAUNCH_PRICE };
