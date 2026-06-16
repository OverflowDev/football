"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { fetcher } from "@/hooks/useApi";
import { useStore } from "@/store";
import { FOOTBALL_FUTURES_ABI, ERC20_ABI } from "@/lib/abi";
import type { FuturesPosition, FuturesSide } from "@/types";

export function useFuturesPositions() {
  return useQuery({
    queryKey: ["futures"],
    queryFn: () => fetcher<{ positions: FuturesPosition[] }>("/api/futures"),
    refetchInterval: 12000,
  });
}

interface PreparedFuture {
  futuresAddress: `0x${string}`;
  usdcAddress: `0x${string}`;
  playerToken: `0x${string}`;
  isLong: boolean;
  size: string;
  leverage: number;
  approveAmount: string;
}

/** Open an on-chain futures position: prepare → approve USDC margin → openPosition. */
export function useOpenFuture() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const addToast = useStore((s) => s.addToast);
  const [pending, setPending] = useState(false);

  async function open(playerId: string, side: FuturesSide, size: number, leverage: number) {
    if (!address || !publicClient) {
      addToast({ variant: "error", title: "Connect a wallet first" });
      return;
    }
    setPending(true);
    try {
      const prep: PreparedFuture = await fetch("/api/futures/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, side, size, leverage }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Prepare failed");
        return r.json();
      });

      const need = BigInt(prep.approveAmount);
      const allowance = (await publicClient.readContract({
        address: prep.usdcAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, prep.futuresAddress],
      })) as bigint;
      if (allowance < need) {
        addToast({ variant: "info", title: "Approve USDC margin", description: "Confirm in your wallet" });
        const aHash = await writeContractAsync({
          address: prep.usdcAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [prep.futuresAddress, need],
        });
        await publicClient.waitForTransactionReceipt({ hash: aHash });
      }

      addToast({ variant: "info", title: "Open position", description: "Confirm in your wallet" });
      const hash = await writeContractAsync({
        address: prep.futuresAddress,
        abi: FOOTBALL_FUTURES_ABI,
        functionName: "openPosition",
        args: [prep.playerToken, prep.isLong, BigInt(prep.size), prep.leverage],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      addToast({ variant: "success", title: `Opened ${leverage}x ${side.toLowerCase()}`, description: `${size} shares` });
      queryClient.invalidateQueries({ queryKey: ["futures"] });
    } catch (e) {
      const msg = (e as Error).message || "Failed to open position";
      if (!/reject|denied|cancell/i.test(msg)) {
        addToast({ variant: "error", title: "Couldn't open position", description: msg });
      }
    } finally {
      setPending(false);
    }
  }

  return { open, pending };
}

/** Close an on-chain position by its contract id. */
export function useCloseFuture() {
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const addToast = useStore((s) => s.addToast);
  const [closingId, setClosingId] = useState<string | null>(null);

  async function close(positionId: string) {
    const futures = process.env.NEXT_PUBLIC_FOOTBALL_FUTURES_ADDRESS as `0x${string}` | undefined;
    if (!futures || !publicClient) {
      addToast({ variant: "error", title: "Futures not configured" });
      return;
    }
    setClosingId(positionId);
    try {
      addToast({ variant: "info", title: "Close position", description: "Confirm in your wallet" });
      const hash = await writeContractAsync({
        address: futures,
        abi: FOOTBALL_FUTURES_ABI,
        functionName: "closePosition",
        args: [BigInt(positionId)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      addToast({ variant: "success", title: "Position closed" });
      queryClient.invalidateQueries({ queryKey: ["futures"] });
    } catch (e) {
      const msg = (e as Error).message || "Failed to close position";
      if (!/reject|denied|cancell/i.test(msg)) {
        addToast({ variant: "error", title: "Couldn't close position", description: msg });
      }
    } finally {
      setClosingId(null);
    }
  }

  return { close, closingId };
}
