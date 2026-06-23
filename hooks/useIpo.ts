"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { FOOTBALL_IPO_ABI, ERC20_ABI } from "@/lib/abi";
import { useStore } from "@/store";

const IPO_ADDR = process.env.NEXT_PUBLIC_FOOTBALL_IPO_ADDRESS as `0x${string}` | undefined;
const USDC_ADDR = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}` | undefined;

/** On-chain IPO actions: deposit USDC into a sale, finalize it, claim shares. */
export function useOnchainIpo() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const addToast = useStore((s) => s.addToast);
  const [busy, setBusy] = useState<string | null>(null); // e.g. "deposit:1"

  const refetch = () => queryClient.invalidateQueries({ queryKey: ["ipos"] });

  async function deposit(saleId: number, usdcAmount: number) {
    if (!address || !publicClient || !IPO_ADDR || !USDC_ADDR) {
      addToast({ variant: "error", title: "Connect a wallet first" });
      return;
    }
    const amount = BigInt(Math.round(usdcAmount * 1e6));
    if (amount <= 0n) return;
    setBusy(`deposit:${saleId}`);
    try {
      const allowance = (await publicClient.readContract({
        address: USDC_ADDR,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, IPO_ADDR],
      })) as bigint;
      if (allowance < amount) {
        addToast({ variant: "info", title: "Approve USDC", description: "Confirm in your wallet" });
        const aHash = await writeContractAsync({
          address: USDC_ADDR,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [IPO_ADDR, amount],
        });
        await publicClient.waitForTransactionReceipt({ hash: aHash });
      }
      addToast({ variant: "info", title: "Deposit", description: "Confirm in your wallet" });
      const hash = await writeContractAsync({
        address: IPO_ADDR,
        abi: FOOTBALL_IPO_ABI,
        functionName: "deposit",
        args: [BigInt(saleId), amount],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      addToast({ variant: "success", title: "Deposited", description: `$${usdcAmount.toFixed(2)} into the presale` });
      refetch();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  async function action(kind: "finalize" | "claim", saleId: number) {
    if (!publicClient || !IPO_ADDR) return;
    setBusy(`${kind}:${saleId}`);
    try {
      const hash = await writeContractAsync({
        address: IPO_ADDR,
        abi: FOOTBALL_IPO_ABI,
        functionName: kind,
        args: [BigInt(saleId)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      addToast({ variant: "success", title: kind === "claim" ? "Shares claimed" : "Sale finalized" });
      refetch();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  function fail(e: unknown) {
    const msg = (e as Error).message || "Transaction failed";
    if (!/reject|denied|cancell/i.test(msg)) {
      addToast({ variant: "error", title: "Transaction failed", description: msg });
    }
  }

  return {
    deposit,
    finalize: (saleId: number) => action("finalize", saleId),
    claim: (saleId: number) => action("claim", saleId),
    busy,
  };
}
