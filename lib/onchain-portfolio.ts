// Reads a wallet's on-chain holdings directly from the chain — the source of
// truth for on-chain positions (no DB mirror to drift out of sync). The DB
// only keeps a Transaction history; balances always come from here.

import { arcPublicClient } from "@/lib/onchain";
import { ERC20_ABI } from "@/lib/abi";
import { DEPLOYED_TOKEN_LIST } from "@/lib/mock-data";
import { marketData } from "@/lib/market-data";
import type { OnChainHolding } from "@/types";

export async function getOnChainHoldings(wallet: string): Promise<OnChainHolding[]> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) return [];

  const out: OnChainHolding[] = [];
  for (const t of DEPLOYED_TOKEN_LIST) {
    let bal: bigint;
    try {
      bal = (await arcPublicClient.readContract({
        address: t.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [wallet as `0x${string}`],
      })) as bigint;
    } catch {
      continue; // RPC hiccup — skip this token rather than failing the whole read
    }
    const shares = Number(bal / 10n ** 18n);
    if (shares <= 0) continue;

    const player = await marketData.getPlayerBySlug(t.slug);
    if (!player) continue;

    out.push({
      player,
      shares,
      currentValue: Math.round(shares * player.currentPrice * 100) / 100,
    });
  }
  return out;
}
