// Server-side oracle: pushes computed FPI prices on-chain to FootballMarket.
// Used by the price-update cron. Safe no-op when the oracle key / market
// address aren't configured, so it never breaks the cron in demo setups.
//
// NOTE: defines the Arc chain locally (does NOT import lib/web3, which is a
// client module) so this stays server-safe.

import { createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { FOOTBALL_MARKET_ABI } from "@/lib/abi";

const ARC_RPC =
  process.env.ARC_TESTNET_RPC_URL ||
  process.env.NEXT_PUBLIC_ARC_RPC_URL ||
  "https://rpc.testnet.arc.network";

const arcTestnet = defineChain({
  id: Number(process.env.ARC_CHAIN_ID || 5042002),
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [ARC_RPC] } },
});

export interface OnChainPriceUpdate {
  /** player token address */
  token: `0x${string}`;
  /** price per whole share in USDC, 6 decimals (e.g. 95.00 -> 95_000000n) */
  price: bigint;
}

export interface OraclePushResult {
  pushed: boolean;
  count: number;
  hash?: string;
  reason?: string;
}

/** Convert a human price (e.g. 95.34) to USDC 6-decimal BigInt. */
export function toUsdc6(price: number): bigint {
  return BigInt(Math.max(0, Math.round(price * 1e6)));
}

/**
 * Batch-push prices to FootballMarket.updatePrices(). Returns a structured
 * result instead of throwing, so cron handlers can log and continue.
 */
export async function pushPricesOnChain(
  updates: OnChainPriceUpdate[]
): Promise<OraclePushResult> {
  const pkRaw = process.env.ORACLE_PRIVATE_KEY;
  const market = process.env.NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS;

  if (!pkRaw || !market) {
    const reason = "ORACLE_PRIVATE_KEY or market address not set";
    // In production a missing oracle config is a visible problem, not a quiet skip.
    if (process.env.NODE_ENV === "production") {
      console.error(`[oracle] on-chain price push DISABLED — ${reason}`);
    }
    return { pushed: false, count: 0, reason };
  }
  if (updates.length === 0) {
    return { pushed: false, count: 0, reason: "no tokenized players to update" };
  }

  try {
    const pk = (pkRaw.startsWith("0x") ? pkRaw : `0x${pkRaw}`) as `0x${string}`;
    const account = privateKeyToAccount(pk);
    const client = createWalletClient({ account, chain: arcTestnet, transport: http(ARC_RPC) });

    const hash = await client.writeContract({
      address: market as `0x${string}`,
      abi: FOOTBALL_MARKET_ABI,
      functionName: "updatePrices",
      args: [updates.map((u) => u.token), updates.map((u) => u.price)],
    });

    return { pushed: true, count: updates.length, hash };
  } catch (e) {
    return { pushed: false, count: 0, reason: (e as Error).message };
  }
}
