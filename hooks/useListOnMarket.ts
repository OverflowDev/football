"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { parseUnits } from "viem";
import { FOOTBALL_MARKET_ABI } from "@/lib/abi";
import { PLAYER_TOKEN_ABI } from "@/lib/contracts/playerToken";
import { useStore } from "@/store";

const MARKET_ADDR = process.env.NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS as `0x${string}` | undefined;

export interface ListMeta {
  saleId: number;
  playerToken: string;
  name: string;
  club: string;
  position: "FWD" | "MID" | "DEF" | "GK";
  nat: string;
}

/**
 * Admin: list a claimed IPO token on the spot market. Mints sell-side inventory
 * from the deployer (token owner), approves the market, calls listExternalToken,
 * then flags the IpoSale row `listed` so it surfaces as a tradable player.
 */
export function useListOnMarket() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const addToast = useStore((s) => s.addToast);
  const [busy, setBusy] = useState(false);

  async function listOnMarket(meta: ListMeta, priceUsd: number, inventoryShares: number): Promise<boolean> {
    if (!address || !publicClient || !MARKET_ADDR) {
      addToast({ variant: "error", title: "Connect the deployer wallet first" });
      return false;
    }
    const token = meta.playerToken as `0x${string}`;
    const price = BigInt(Math.round(priceUsd * 1e6));
    const inventory = parseUnits(String(inventoryShares), 18);
    setBusy(true);
    try {
      // 1. mint sell inventory to the deployer (token owner)
      let h = await writeContractAsync({ address: token, abi: PLAYER_TOKEN_ABI, functionName: "mint", args: [address, inventory] });
      await publicClient.waitForTransactionReceipt({ hash: h });
      // 2. approve the market to pull the inventory
      h = await writeContractAsync({ address: token, abi: PLAYER_TOKEN_ABI, functionName: "approve", args: [MARKET_ADDR, inventory] });
      await publicClient.waitForTransactionReceipt({ hash: h });
      // 3. list it on the spot market
      h = await writeContractAsync({ address: MARKET_ADDR, abi: FOOTBALL_MARKET_ABI, functionName: "listExternalToken", args: [token, price, inventory] });
      await publicClient.waitForTransactionReceipt({ hash: h });

      // 4. surface it as a tradable player (admin-gated)
      const res = await fetch("/api/ipo/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...meta, price: priceUsd }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Listed on-chain but couldn't surface it in the grid");
      }

      addToast({ variant: "success", title: "Listed on spot market", description: `${meta.name} is now tradable` });
      queryClient.invalidateQueries({ queryKey: ["ipos"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      return true;
    } catch (e) {
      const msg = (e as Error).message || "Listing failed";
      if (!/reject|denied|cancell/i.test(msg)) {
        addToast({ variant: "error", title: "Couldn't list token", description: msg });
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { listOnMarket, busy };
}
