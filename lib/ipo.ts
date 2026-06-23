// IPO ("Initial Player Offering") listings.
//
// LIVE offerings are run as a crypto-style PRESALE: there's a fixed pool of
// shares, and buyers commit (shares, price) bids. The price/token is not fixed
// — it's the volume-weighted "clearing price" set by ALL buyers' commitments
// (raised ÷ shares committed). The more (and higher) buyers commit, the higher
// the price everyone is discovering.
//
// Commitments live in an in-memory store (the IPO layer is demo/off-chain), so
// they persist across requests within a running server.

import { getAllPlayers } from "@/lib/mock-data";
import type { IpoCommitment, IpoListing, Position } from "@/types";

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

/** True when on-chain presales are configured (use the contract, not the demo pool). */
export const ipoOnChain = !!FOOTBALL_IPO_ADDRESS && ON_CHAIN_SALES.length > 0;

export function ipoAvatar(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&bold=true&size=128`;
}
const avatar = ipoAvatar;
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

// ── live presales ───────────────────────────────────────────────────────
interface LiveSeed {
  name: string;
  club: string;
  position: Position;
  nat: string;
  endsInDays: number;
  sharesForSale: number;
  seed: IpoCommitment[]; // initial commitments so price discovery has started
}

const LIVE: LiveSeed[] = [
  {
    name: "Rodrigo Mora",
    club: "FC Porto",
    position: "FWD",
    nat: "pt",
    endsInDays: 2,
    sharesForSale: 1_000_000,
    seed: [
      { shares: 180_000, price: 10 },
      { shares: 160_000, price: 10.5 },
      { shares: 140_000, price: 11.25 },
      { shares: 90_000, price: 12 },
      { shares: 80_000, price: 12.5 },
    ],
  },
  {
    name: "Mathys Tel",
    club: "Tottenham Hotspur",
    position: "FWD",
    nat: "fr",
    endsInDays: 4,
    sharesForSale: 1_000_000,
    seed: [
      { shares: 120_000, price: 9.5 },
      { shares: 110_000, price: 10 },
      { shares: 60_000, price: 10.75 },
      { shares: 40_000, price: 11.5 },
    ],
  },
];

const liveId = (i: number) => `ipo_live_${i}`;

// ── in-memory commitments store ───────────────────────────────────────
interface CommitmentRec extends IpoCommitment {
  wallet: string; // lowercased wallet address, or "anon"
}

const globalForIpo = globalThis as unknown as {
  __fpiIpo?: Record<string, CommitmentRec[]>;
};

function store(): Record<string, CommitmentRec[]> {
  if (!globalForIpo.__fpiIpo) {
    const seeded: Record<string, CommitmentRec[]> = {};
    LIVE.forEach((l, i) => (seeded[liveId(i)] = l.seed.map((c) => ({ ...c, wallet: "seed" }))));
    globalForIpo.__fpiIpo = seeded;
  }
  return globalForIpo.__fpiIpo;
}

function aggregate(id: string) {
  const commitments = store()[id] ?? [];
  const sharesCommitted = commitments.reduce((s, c) => s + c.shares, 0);
  const raised = Math.round(commitments.reduce((s, c) => s + c.shares * c.price, 0) * 100) / 100;
  const clearingPrice = sharesCommitted > 0 ? Math.round((raised / sharesCommitted) * 100) / 100 : IPO_LAUNCH_PRICE;
  // distinct contributing wallets (seed counted as one cohort)
  const contributors = new Set(commitments.map((c) => c.wallet)).size;
  return { sharesCommitted, raised, clearingPrice, contributors };
}

function myAggregate(id: string, wallet: string | null) {
  if (!wallet) return { myShares: 0, myContribution: 0, myAvgPrice: 0 };
  const w = wallet.toLowerCase();
  const mine = (store()[id] ?? []).filter((c) => c.wallet === w);
  const myShares = mine.reduce((s, c) => s + c.shares, 0);
  const myContribution = Math.round(mine.reduce((s, c) => s + c.shares * c.price, 0) * 100) / 100;
  const myAvgPrice = myShares > 0 ? Math.round((myContribution / myShares) * 100) / 100 : 0;
  return { myShares, myContribution, myAvgPrice };
}

/** Record a presale commitment (a bid of `shares` at `price`) for a wallet. */
export function commitToIpo(id: string, shares: number, price: number, wallet: string | null) {
  const live = LIVE.findIndex((_, i) => liveId(i) === id);
  if (live === -1) return { ok: false as const, error: "Offering not found" };
  if (shares <= 0 || price <= 0) return { ok: false as const, error: "Enter a valid amount and price" };
  store()[id].push({ shares: Math.floor(shares), price, wallet: (wallet ?? "anon").toLowerCase() });
  return { ok: true as const, aggregate: aggregate(id), mine: myAggregate(id, wallet) };
}

export function getIpos(wallet: string | null = null): IpoListing[] {
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
    const agg = aggregate(liveId(i));
    const mine = myAggregate(liveId(i), wallet);
    out.push({
      id: liveId(i),
      name: l.name,
      club: l.club,
      position: l.position,
      nationalityCode: l.nat,
      imageUrl: avatar(l.name),
      status: "LIVE",
      ipoPrice: IPO_LAUNCH_PRICE,
      endsAt: daysFromNow(l.endsInDays),
      sharesForSale: l.sharesForSale,
      sharesCommitted: agg.sharesCommitted,
      raised: agg.raised,
      clearingPrice: agg.clearingPrice,
      contributors: agg.contributors,
      myShares: mine.myShares,
      myContribution: mine.myContribution,
      myAvgPrice: mine.myAvgPrice,
    });
  });

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
