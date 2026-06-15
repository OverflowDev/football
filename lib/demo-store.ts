// In-memory mutable state for DEMO mode so virtual trades actually persist
// across requests within a running dev server (no DB required).

import { DEMO_HOLDINGS, DEMO_USER, PLAYERS } from "@/lib/mock-data";
import type { FuturesSide, PositionStatus, Transaction } from "@/types";

interface DemoHolding {
  playerId: string;
  shares: number;
  averageBuyPrice: number;
  totalInvested: number;
}

interface DemoFuture {
  id: string;
  playerId: string;
  side: FuturesSide;
  size: number;
  leverage: number;
  entryPrice: number;
  margin: number;
  liquidationPrice: number;
  fee: number;
  status: PositionStatus;
  openedAt: string;
}

const globalForDemo = globalThis as unknown as {
  __fpiDemo?: {
    balance: number;
    holdings: Map<string, DemoHolding>;
    transactions: Transaction[];
    watchlist: Set<string>;
    futures: DemoFuture[];
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
    futures: [] as DemoFuture[],
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

export function demoOpenFuture(args: {
  playerId: string;
  side: FuturesSide;
  size: number;
  leverage: number;
  entryPrice: number;
  margin: number;
  liquidationPrice: number;
  fee: number;
}): DemoFuture {
  const state = demoState();
  state.balance = Math.round((state.balance - args.margin - args.fee) * 100) / 100;
  const pos: DemoFuture = {
    id: `fut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    playerId: args.playerId,
    side: args.side,
    size: args.size,
    leverage: args.leverage,
    entryPrice: args.entryPrice,
    margin: args.margin,
    liquidationPrice: args.liquidationPrice,
    fee: args.fee,
    status: "OPEN",
    openedAt: new Date().toISOString(),
  };
  state.futures.unshift(pos);
  return pos;
}

export function demoCloseFuture(positionId: string): { realizedPnl: number } | null {
  const state = demoState();
  const pos = state.futures.find((f) => f.id === positionId);
  if (!pos || pos.status !== "OPEN") return null;

  const player = PLAYERS.find((p) => p.id === pos.playerId);
  const mark = player?.currentPrice ?? pos.entryPrice;
  const diff = pos.side === "LONG" ? mark - pos.entryPrice : pos.entryPrice - mark;
  let pnl = Math.round(diff * pos.size * 100) / 100;
  pnl = Math.max(pnl, -pos.margin);

  const liquidated =
    (pos.side === "LONG" && mark <= pos.liquidationPrice) ||
    (pos.side === "SHORT" && mark >= pos.liquidationPrice);

  const payout = liquidated ? 0 : Math.max(0, pos.margin + pnl - pos.fee);
  state.balance = Math.round((state.balance + payout) * 100) / 100;
  pos.status = liquidated ? "LIQUIDATED" : "CLOSED";

  return { realizedPnl: liquidated ? -pos.margin : pnl };
}
