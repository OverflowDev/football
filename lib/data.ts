// Data-access facade. Player + portfolio reads go through the active
// MarketDataProvider (Prisma in prod, demo otherwise). Transactions + market
// stats are derived here.

import { hasDatabase } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { marketData } from "@/lib/market-data";
import { getPlayerById as mockGetPlayerById } from "@/lib/mock-data";
import { demoState } from "@/lib/demo-store";
import type { MarketStats, Player, Transaction } from "@/types";

// ---- players (via provider) ----------------------------------------
export function fetchPlayers(): Promise<Player[]> {
  return marketData.getPlayers();
}
export function fetchPlayer(slug: string): Promise<Player | null> {
  return marketData.getPlayerBySlug(slug);
}
export function fetchPlayerById(id: string): Promise<Player | null> {
  return marketData.getPlayerById(id);
}

// ---- market stats ---------------------------------------------------
export async function fetchMarketStats(): Promise<MarketStats> {
  const players = await fetchPlayers();
  const totalMarketCap = players.reduce((s, p) => s + p.marketCap, 0);
  const totalVolume24h = players.reduce((s, p) => s + p.volume24h, 0);
  const sorted = [...players].sort((a, b) => b.priceChangePercent24h - a.priceChangePercent24h);
  const avgSentiment = players.length
    ? players.reduce((s, p) => s + p.priceChangePercent24h, 0) / players.length
    : 0;
  return {
    totalMarketCap,
    totalVolume24h,
    activePlayers: players.filter((p) => p.isActive).length,
    topGainer: sorted[0] ?? null,
    topLoser: sorted[sorted.length - 1] ?? null,
    marketSentiment: Math.round(Math.max(-100, Math.min(100, avgSentiment * 8))),
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
      playerSymbol: mockGetPlayerById(r.playerId)?.symbol ?? "$???",
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
