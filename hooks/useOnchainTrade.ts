"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { FOOTBALL_MARKET_ABI, ERC20_ABI } from "@/lib/abi";
import { useStore } from "@/store";

interface PrepareResponse {
  chainId: number;
  marketAddress: `0x${string}`;
  usdcAddress: `0x${string}`;
  playerToken: `0x${string}`;
  functionName: "buyShares" | "sellShares";
  args: [string, string]; // [playerToken, amountWei]
  approveAmount: string;
}

/**
 * On-chain spot trade: prepare (server) → approve (USDC for buy / player token
 * for sell) → buy/sellShares → confirm (server verifies the receipt + event).
 */
export function useOnchainTrade() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const addToast = useStore((s) => s.addToast);
  const [pending, setPending] = useState(false);

  async function trade(playerId: string, side: "BUY" | "SELL", shares: number) {
    if (!address || !publicClient) {
      addToast({ variant: "error", title: "Connect a wallet first" });
      return;
    }
    setPending(true);
    try {
      const prep: PrepareResponse = await fetch("/api/trade/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, side, shares }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Prepare failed");
        return r.json();
      });

      const amountWei = BigInt(prep.args[1]);

      // ── approval step ──
      if (side === "BUY") {
        const allowance = (await publicClient.readContract({
          address: prep.usdcAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, prep.marketAddress],
        })) as bigint;
        const need = BigInt(prep.approveAmount);
        if (allowance < need) {
          addToast({ variant: "info", title: "Approve USDC", description: "Confirm the approval in your wallet" });
          const aHash = await writeContractAsync({
            address: prep.usdcAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [prep.marketAddress, need],
          });
          await publicClient.waitForTransactionReceipt({ hash: aHash });
        }
      } else {
        // selling: approve the market to pull the player token
        const allowance = (await publicClient.readContract({
          address: prep.playerToken,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, prep.marketAddress],
        })) as bigint;
        if (allowance < amountWei) {
          addToast({ variant: "info", title: "Approve shares", description: "Confirm the approval in your wallet" });
          const aHash = await writeContractAsync({
            address: prep.playerToken,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [prep.marketAddress, amountWei],
          });
          await publicClient.waitForTransactionReceipt({ hash: aHash });
        }
      }

      // ── trade tx ──
      addToast({ variant: "info", title: "Confirm trade", description: "Sign the transaction in your wallet" });
      const hash = await writeContractAsync({
        address: prep.marketAddress,
        abi: FOOTBALL_MARKET_ABI,
        functionName: prep.functionName,
        args: [prep.playerToken, amountWei],
      });

      // ── server verifies the receipt + event ──
      const confirmRes = await fetch("/api/trade/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash, playerId, side }),
      });
      const data = await confirmRes.json();
      if (!confirmRes.ok || !data.success) throw new Error(data.error || "On-chain confirmation failed");

      addToast({
        variant: "success",
        title: `On-chain ${side === "BUY" ? "buy" : "sell"} confirmed`,
        description: `${data.shares} shares @ $${data.pricePerShare?.toFixed(2)}`,
      });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } catch (e) {
      const msg = (e as Error).message || "Trade failed";
      if (!/reject|denied|cancell/i.test(msg)) {
        addToast({ variant: "error", title: "On-chain trade failed", description: msg });
      }
    } finally {
      setPending(false);
    }
  }

  return { trade, pending };
}
