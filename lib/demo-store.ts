// In-memory mutable state for DEMO mode so virtual trades actually persist
// across requests within a running dev server (no DB required).

import { DEMO_HOLDINGS, DEMO_USER, PLAYERS } from "@/lib/mock-data";
import type { Transaction } from "@/types";

interface DemoHolding {
  playerId: string;
  shares: number;
  averageBuyPrice: number;
  totalInvested: number;
}

const globalForDemo = globalThis as unknown as {
  __fpiDemo?: {
    balance: number;
    holdings: Map<string, DemoHolding>;
    transactions: Transaction[];
    watchlist: Set<string>;
  };
};

function init() {
  const holdings = new Map<string, DemoHolding>();
  for (const h of DEMO_HOLDINGS) {
    holdings.set(h.playerId, {
      playerId: h.playerId,
      shares: h.shares,
      averageBuyPrice: h.averageBuyPrice,
      totalInvested: Math.round(h.shares * h.averageBuyPrice * 100) / 100,
    });
  }
  return {
    balance: DEMO_USER.virtualBalance,
    holdings,
    transactions: [] as Transaction[],
    watchlist: new Set<string>(["player_2", "player_7", "player_33"]),
  };
}

export function demoState() {
  if (!globalForDemo.__fpiDemo) globalForDemo.__fpiDemo = init();
  return globalForDemo.__fpiDemo;
}

export function demoApplyTrade(
  playerId: string,
  type: "BUY" | "SELL",
  shares: number,
  pricePerShare: number,
  fee: number,
  total: number,
  isOnChain: boolean
): Transaction {
  const state = demoState();
  const player = PLAYERS.find((p) => p.id === playerId);
  const existing = state.holdings.get(playerId);

  if (type === "BUY") {
    state.balance = Math.round((state.balance - total - fee) * 100) / 100;
    if (existing) {
      const newShares = existing.shares + shares;
      const newInvested = existing.totalInvested + total;
      existing.shares = newShares;
      existing.totalInvested = Math.round(newInvested * 100) / 100;
      existing.averageBuyPrice = Math.round((newInvested / newShares) * 100) / 100;
    } else {
      state.holdings.set(playerId, {
        playerId,
        shares,
        averageBuyPrice: pricePerShare,
        totalInvested: total,
      });
    }
  } else {
    state.balance = Math.round((state.balance + total - fee) * 100) / 100;
    if (existing) {
      existing.shares -= shares;
      existing.totalInvested = Math.round(existing.averageBuyPrice * existing.shares * 100) / 100;
      if (existing.shares <= 0) state.holdings.delete(playerId);
    }
  }

  const tx: Transaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    playerId,
    playerName: player?.name ?? "Unknown",
    playerSymbol: player?.symbol ?? "$???",
    type,
    shares,
    pricePerShare,
    totalAmount: total,
    fee,
    isOnChain,
    txHash: isOnChain ? `0x${Math.random().toString(16).slice(2).padEnd(40, "0").slice(0, 40)}` : null,
    createdAt: new Date().toISOString(),
    actor: "you",
  };
  state.transactions.unshift(tx);
  return tx;
}
