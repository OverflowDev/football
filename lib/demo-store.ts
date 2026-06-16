// In-memory state for DEMO mode (no database). Holds the watchlist and a
// transaction-history list so those features work without Postgres. Trading
// itself is on-chain, so there's no virtual balance/holdings here.

import type { Transaction } from "@/types";

const globalForDemo = globalThis as unknown as {
  __fpiDemo?: {
    transactions: Transaction[];
    watchlist: Set<string>;
  };
};

function init() {
  return {
    transactions: [] as Transaction[],
    watchlist: new Set<string>(["player_2", "player_7", "player_33"]),
  };
}

export function demoState() {
  if (!globalForDemo.__fpiDemo) globalForDemo.__fpiDemo = init();
  return globalForDemo.__fpiDemo;
}
