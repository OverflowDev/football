// Server-side on-chain verification. The server NEVER trusts the client's claim
// that a trade happened — it waits for the receipt, confirms success, and checks
// that a SharesBought/SharesSold event came from our market contract for the
// expected user, token and amount.

import { createPublicClient, defineChain, http, parseEventLogs } from "viem";
import { FOOTBALL_MARKET_ABI } from "@/lib/abi";

const ARC_RPC =
  process.env.ARC_TESTNET_RPC_URL ||
  process.env.NEXT_PUBLIC_ARC_RPC_URL ||
  "https://rpc.testnet.arc.network";

export const arcTestnet = defineChain({
  id: Number(process.env.ARC_CHAIN_ID || 5042002),
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [ARC_RPC] } },
});

export const arcPublicClient = createPublicClient({ chain: arcTestnet, transport: http(ARC_RPC) });
const publicClient = arcPublicClient;

export interface ConfirmArgs {
  hash: `0x${string}`;
  expectedUser: string;
  expectedToken: string;
  side: "BUY" | "SELL";
}

export interface ConfirmResult {
  ok: boolean;
  reason?: string;
  shares?: number; // 18-dp amount converted to whole shares
  price?: number; // USDC 6-dp converted to a number
  txHash?: string;
}

export async function confirmTradeReceipt(args: ConfirmArgs): Promise<ConfirmResult> {
  const market = process.env.NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS?.toLowerCase();
  if (!market) return { ok: false, reason: "Market address not configured" };

  let receipt;
  try {
    receipt = await publicClient.waitForTransactionReceipt({ hash: args.hash, timeout: 60_000 });
  } catch {
    return { ok: false, reason: "Could not fetch transaction receipt" };
  }

  if (receipt.status !== "success") return { ok: false, reason: "Transaction reverted" };
  if (receipt.to?.toLowerCase() !== market) {
    return { ok: false, reason: "Transaction was not sent to the market contract" };
  }

  const eventName = args.side === "BUY" ? "SharesBought" : "SharesSold";
  const logs = parseEventLogs({
    abi: FOOTBALL_MARKET_ABI,
    eventName,
    logs: receipt.logs,
  });
  const ev = logs.find((l) => l.address.toLowerCase() === market);
  if (!ev) return { ok: false, reason: `No ${eventName} event from the market contract` };

  const a = ev.args as unknown as {
    user: string;
    playerToken: string;
    amount: bigint;
    price: bigint;
  };

  if (a.user.toLowerCase() !== args.expectedUser.toLowerCase()) {
    return { ok: false, reason: "Event user does not match the session wallet" };
  }
  if (a.playerToken.toLowerCase() !== args.expectedToken.toLowerCase()) {
    return { ok: false, reason: "Event token does not match the player" };
  }
  // The platform trades whole shares only. Reject fractional amounts so the
  // 18-decimal on-chain amount maps exactly to an Int share count (no truncation).
  if (a.amount % 10n ** 18n !== 0n) {
    return { ok: false, reason: "Fractional share amounts are not supported" };
  }

  return {
    ok: true,
    shares: Number(a.amount / 10n ** 18n),
    price: Number(a.price) / 1e6,
    txHash: receipt.transactionHash,
  };
}
