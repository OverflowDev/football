// Explicit data-provider split. The DEMO provider reads the deterministic mock
// layer + in-memory demo store; the PRISMA provider reads the database as the
// source of truth. We never read prices from mock data when a DB is configured.

import { hasDatabase } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import {
  getAllPlayers,
  getPlayerById as mockGetPlayerById,
  getPlayerBySlug as mockGetPlayerBySlug,
  nationalityCodeFor,
  symbolFor,
} from "@/lib/mock-data";
import type { Player, Position, League } from "@/types";

export interface MarketDataProvider {
  getPlayers(): Promise<Player[]>;
  getPlayerById(id: string): Promise<Player | null>;
  getPlayerBySlug(slug: string): Promise<Player | null>;
}

// ──────────────────────────── DEMO provider ──────────────────────────
const demoProvider: MarketDataProvider = {
  async getPlayers() {
    return getAllPlayers();
  },
  async getPlayerById(id) {
    return mockGetPlayerById(id) ?? null;
  },
  async getPlayerBySlug(slug) {
    return mockGetPlayerBySlug(slug) ?? null;
  },
};

// ─────────────────────────── PRISMA provider ─────────────────────────
type DbPlayer = Awaited<ReturnType<typeof loadDbPlayers>>[number];

function loadDbPlayers() {
  return prisma.player.findMany({
    where: { isActive: true },
    include: { club: true, stats: { orderBy: { season: "desc" }, take: 1 } },
  });
}

function mapDbPlayer(row: DbPlayer): Player {
  const s = row.stats[0];
  const currentPrice = Number(row.currentPrice);
  const change24h = Number(row.priceChangePercent24h);
  const marketCap = Number(row.marketCap);
  return {
    id: row.id,
    apiFootballId: row.apiFootballId,
    name: row.name,
    slug: row.slug,
    position: row.position as Position,
    nationality: row.nationality,
    nationalityCode: nationalityCodeFor(row.nationality),
    age: row.age,
    club: {
      id: row.club.id,
      name: row.club.name,
      shortName: row.club.shortName,
      logo: row.club.logo ?? "",
      league: row.club.league as League,
      country: row.club.country,
    },
    currentPrice,
    previousPrice: Number(row.previousPrice),
    priceChange24h: Number(row.priceChange24h),
    priceChangePercent24h: change24h,
    priceChangePercent7d: Math.round(change24h * 1.4 * 100) / 100,
    marketCap,
    totalShares: row.totalShares,
    sharesAvailable: row.sharesAvailable,
    volume24h: Math.round(marketCap * 0.01),
    baseValue: Number(row.baseValue),
    formRating: Number(row.formRating),
    rumorScore: Number(row.rumorScore),
    injuryStatus: row.injuryStatus,
    performanceIndex: Number(row.performanceIndex),
    imageUrl: row.imageUrl ?? "",
    contractAddress: row.contractAddress,
    tokenId: row.tokenId,
    isActive: row.isActive,
    symbol: symbolFor(row.name),
    stats: {
      season: s?.season ?? "2024/25",
      matches: s?.matches ?? 0,
      goals: s?.goals ?? 0,
      assists: s?.assists ?? 0,
      minutesPlayed: s?.minutesPlayed ?? 0,
      yellowCards: s?.yellowCards ?? 0,
      redCards: s?.redCards ?? 0,
      rating: Number(s?.rating ?? 0),
      form: Number(s?.form ?? 0),
    },
  };
}

const prismaProvider: MarketDataProvider = {
  async getPlayers() {
    const rows = await loadDbPlayers();
    return rows.map(mapDbPlayer);
  },
  async getPlayerById(id) {
    const row = await prisma.player.findUnique({
      where: { id },
      include: { club: true, stats: { orderBy: { season: "desc" }, take: 1 } },
    });
    return row ? mapDbPlayer(row) : null;
  },
  async getPlayerBySlug(slug) {
    const row = await prisma.player.findUnique({
      where: { slug },
      include: { club: true, stats: { orderBy: { season: "desc" }, take: 1 } },
    });
    return row ? mapDbPlayer(row) : null;
  },
};

/**
 * Resilient wrapper: prefer Prisma, but if the DB is unreachable/slow (e.g.
 * Supabase free-tier cold start) fall back to the deterministic mock layer so
 * pages render instead of throwing a 500.
 */
function resilient(): MarketDataProvider {
  const warn = (m: string, e: unknown) => console.error(`[market-data] ${m} — falling back to mock`, e);
  return {
    async getPlayers() {
      try {
        return await prismaProvider.getPlayers();
      } catch (e) {
        warn("getPlayers DB error", e);
        return demoProvider.getPlayers();
      }
    },
    async getPlayerById(id) {
      try {
        return await prismaProvider.getPlayerById(id);
      } catch (e) {
        warn("getPlayerById DB error", e);
        return demoProvider.getPlayerById(id);
      }
    },
    async getPlayerBySlug(slug) {
      try {
        return await prismaProvider.getPlayerBySlug(slug);
      } catch (e) {
        warn("getPlayerBySlug DB error", e);
        return demoProvider.getPlayerBySlug(slug);
      }
    },
  };
}

/**
 * Overlay listed IPO tokens (FootballMarket.listExternalToken) as tradable
 * players, so claimed IPO offerings appear in the spot market grid + pages.
 */
function withIpoListings(base: MarketDataProvider): MarketDataProvider {
  // imported lazily to avoid a cycle (ipo-listings → onchain → …)
  const ipo = () => import("@/lib/ipo-listings").then((m) => m.getListedIpoPlayers());
  return {
    async getPlayers() {
      const [players, listed] = await Promise.all([base.getPlayers(), ipo().catch(() => [])]);
      const slugs = new Set(players.map((p) => p.slug));
      return [...listed.filter((p) => !slugs.has(p.slug)), ...players];
    },
    async getPlayerById(id) {
      const found = await base.getPlayerById(id);
      if (found) return found;
      const listed = await ipo().catch(() => []);
      return listed.find((p) => p.id === id) ?? null;
    },
    async getPlayerBySlug(slug) {
      const found = await base.getPlayerBySlug(slug);
      if (found) return found;
      const listed = await ipo().catch(() => []);
      return listed.find((p) => p.slug === slug) ?? null;
    },
  };
}

/** The active provider: resilient Prisma when a DB is configured, else demo. */
export const marketData: MarketDataProvider = withIpoListings(hasDatabase ? resilient() : demoProvider);
export { demoProvider, prismaProvider };
