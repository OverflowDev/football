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
import { demoState } from "@/lib/demo-store";
import type { Holding, Player, PortfolioSummary, Position, League } from "@/types";

export interface MarketDataProvider {
  getPlayers(): Promise<Player[]>;
  getPlayerById(id: string): Promise<Player | null>;
  getPlayerBySlug(slug: string): Promise<Player | null>;
  getPortfolio(userId: string): Promise<PortfolioSummary>;
}

// ───────────────────────── shared portfolio math ─────────────────────
function buildHolding(player: Player, shares: number, avgBuy: number, invested: number): Holding {
  const currentValue = Math.round(shares * player.currentPrice * 100) / 100;
  const pnl = Math.round((currentValue - invested) * 100) / 100;
  const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
  return {
    player,
    shares,
    averageBuyPrice: avgBuy,
    totalInvested: invested,
    currentValue,
    pnl,
    pnlPercent: Math.round(pnlPercent * 100) / 100,
  };
}

function summarize(holdings: Holding[], cashBalance: number): PortfolioSummary {
  holdings.sort((a, b) => b.currentValue - a.currentValue);
  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalInvested = holdings.reduce((s, h) => s + h.totalInvested, 0);
  const totalPnl = Math.round((totalValue - totalInvested) * 100) / 100;
  const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const dayChange = holdings.reduce((s, h) => s + h.shares * h.player.priceChange24h, 0);
  const dayChangePercent = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;
  const byPnl = [...holdings].sort((a, b) => b.pnlPercent - a.pnlPercent);
  return {
    totalValue: Math.round(totalValue * 100) / 100,
    totalInvested: Math.round(totalInvested * 100) / 100,
    cashBalance: Math.round(cashBalance * 100) / 100,
    totalPnl,
    totalPnlPercent: Math.round(totalPnlPercent * 100) / 100,
    dayChange: Math.round(dayChange * 100) / 100,
    dayChangePercent: Math.round(dayChangePercent * 100) / 100,
    holdingsCount: holdings.length,
    bestPerformer: byPnl[0] ?? null,
    worstPerformer: byPnl.length > 1 ? byPnl[byPnl.length - 1] : null,
    holdings,
  };
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
  async getPortfolio() {
    const state = demoState();
    const holdings: Holding[] = [];
    for (const h of state.holdings.values()) {
      const player = mockGetPlayerById(h.playerId);
      if (!player) continue;
      holdings.push(buildHolding(player, h.shares, h.averageBuyPrice, h.totalInvested));
    }
    return summarize(holdings, state.balance);
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
  async getPortfolio(userId) {
    const [rows, user] = await Promise.all([
      prisma.portfolio.findMany({ where: { userId }, include: { player: { include: { club: true, stats: { orderBy: { season: "desc" }, take: 1 } } } } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);
    const holdings = rows.map((r) =>
      buildHolding(mapDbPlayer(r.player), r.shares, Number(r.averageBuyPrice), Number(r.totalInvested))
    );
    return summarize(holdings, Number(user?.virtualBalance ?? 0));
  },
};

/** The active provider: Prisma when a database is configured, else demo. */
export const marketData: MarketDataProvider = hasDatabase ? prismaProvider : demoProvider;
export { demoProvider, prismaProvider };
