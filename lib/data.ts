// Unified data-access layer. Prefers Prisma when a database is configured,
// otherwise serves the deterministic mock layer + demo store. Everything
// returns plain serializable types (see types/index.ts).

import { hasDatabase } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import {
  getAllPlayers,
  getPlayerById,
  getPlayerBySlug,
} from "@/lib/mock-data";
import { demoState } from "@/lib/demo-store";
import type {
  Holding,
  MarketStats,
  Player,
  PortfolioSummary,
  Transaction,
} from "@/types";

// ---- players --------------------------------------------------------
export async function fetchPlayers(): Promise<Player[]> {
  // The mock layer is always the source of canonical Player shape for the
  // UI. With a DB wired, live price fields would be merged here.
  return getAllPlayers();
}

export async function fetchPlayer(slug: string): Promise<Player | null> {
  return getPlayerBySlug(slug) ?? null;
}

export async function fetchPlayerById(id: string): Promise<Player | null> {
  return getPlayerById(id) ?? null;
}

// ---- market stats ---------------------------------------------------
export async function fetchMarketStats(): Promise<MarketStats> {
  const players = await fetchPlayers();
  const totalMarketCap = players.reduce((s, p) => s + p.marketCap, 0);
  const totalVolume24h = players.reduce((s, p) => s + p.volume24h, 0);
  const sorted = [...players].sort(
    (a, b) => b.priceChangePercent24h - a.priceChangePercent24h
  );
  const avgSentiment =
    players.reduce((s, p) => s + p.priceChangePercent24h, 0) / players.length;
  return {
    totalMarketCap,
    totalVolume24h,
    activePlayers: players.filter((p) => p.isActive).length,
    topGainer: sorted[0] ?? null,
    topLoser: sorted[sorted.length - 1] ?? null,
    marketSentiment: Math.round(Math.max(-100, Math.min(100, avgSentiment * 8))),
  };
}

// ---- portfolio ------------------------------------------------------
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

export async function fetchPortfolio(userId: string): Promise<PortfolioSummary> {
  let holdings: Holding[] = [];
  let cashBalance = 0;

  if (hasDatabase && userId !== "demo-user") {
    const [rows, user] = await Promise.all([
      prisma.portfolio.findMany({ where: { userId }, include: { player: true } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);
    cashBalance = Number(user?.virtualBalance ?? 0);
    for (const row of rows) {
      const player = getPlayerById(row.playerId);
      if (!player) continue;
      holdings.push(
        buildHolding(
          player,
          row.shares,
          Number(row.averageBuyPrice),
          Number(row.totalInvested)
        )
      );
    }
  } else {
    const state = demoState();
    cashBalance = state.balance;
    for (const h of state.holdings.values()) {
      const player = getPlayerById(h.playerId);
      if (!player) continue;
      holdings.push(
        buildHolding(player, h.shares, h.averageBuyPrice, h.totalInvested)
      );
    }
  }

  holdings.sort((a, b) => b.currentValue - a.currentValue);

  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalInvested = holdings.reduce((s, h) => s + h.totalInvested, 0);
  const totalPnl = Math.round((totalValue - totalInvested) * 100) / 100;
  const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  // approximate 24h change from each holding's player day move
  const dayChange = holdings.reduce(
    (s, h) => s + h.shares * (h.player.priceChange24h),
    0
  );
  const dayChangePercent =
    totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;

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

// ---- transactions ---------------------------------------------------
export async function fetchTransactions(userId: string): Promise<Transaction[]> {
  if (hasDatabase && userId !== "demo-user") {
    const rows = await prisma.transaction.findMany({
      where: { userId },
      include: { player: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      playerId: r.playerId,
      playerName: r.player.name,
      playerSymbol: getPlayerById(r.playerId)?.symbol ?? "$???",
      type: r.type,
      shares: r.shares,
      pricePerShare: Number(r.pricePerShare),
      totalAmount: Number(r.totalAmount),
      fee: Number(r.fee),
      isOnChain: r.isOnChain,
      txHash: r.txHash,
      createdAt: r.createdAt.toISOString(),
    }));
  }
  return demoState().transactions;
}
