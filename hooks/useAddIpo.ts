"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useWalletClient, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { parseUnits } from "viem";
import { FOOTBALL_IPO_ABI } from "@/lib/abi";
import { PLAYER_TOKEN_ABI, PLAYER_TOKEN_BYTECODE } from "@/lib/contracts/playerToken";
import { useStore } from "@/store";

const IPO_ADDR = process.env.NEXT_PUBLIC_FOOTBALL_IPO_ADDRESS as `0x${string}` | undefined;

export interface NewIpoForm {
  name: string;
  symbol: string;
  club: string;
  position: "FWD" | "MID" | "DEF" | "GK";
  nat: string;
  pool: number; // whole shares
  days: number;
}

/**
 * Admin: open a new presale entirely from the deployer's connected wallet —
 * deploy share token → mint pool → approve → createSale → persist metadata.
 */
export function useAddIpo() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const addToast = useStore((s) => s.addToast);
  const [step, setStep] = useState<string | null>(null);

  async function addIpo(form: NewIpoForm): Promise<boolean> {
    if (!address || !publicClient || !walletClient || !IPO_ADDR) {
      addToast({ variant: "error", title: "Connect the deployer wallet first" });
      return false;
    }
    const pool = parseUnits(String(form.pool), 18);
    const endsAt = BigInt(Math.floor(Date.now() / 1000) + form.days * 86400);
    const tokenId = BigInt(Math.floor(Date.now() / 1000) % 1_000_000);

    try {
      // 1. deploy the share token (pool minted to deployer below)
      setStep("Deploying share token…");
      const deployHash = await walletClient.deployContract({
        abi: PLAYER_TOKEN_ABI,
        bytecode: PLAYER_TOKEN_BYTECODE,
        args: [`${form.name} Shares`, form.symbol, tokenId, address],
      });
      const deployRcpt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
      const token = deployRcpt.contractAddress;
      if (!token) throw new Error("Token deploy failed (no contract address)");

      // 2. mint the pool to the deployer
      setStep("Minting share pool…");
      let h = await writeContractAsync({ address: token, abi: PLAYER_TOKEN_ABI, functionName: "mint", args: [address, pool] });
      await publicClient.waitForTransactionReceipt({ hash: h });

      // 3. approve the IPO to pull the pool
      setStep("Approving pool…");
      h = await writeContractAsync({ address: token, abi: PLAYER_TOKEN_ABI, functionName: "approve", args: [IPO_ADDR, pool] });
      await publicClient.waitForTransactionReceipt({ hash: h });

      // 4. open the sale
      setStep("Opening sale…");
      h = await writeContractAsync({ address: IPO_ADDR, abi: FOOTBALL_IPO_ABI, functionName: "createSale", args: [token, pool, endsAt] });
      await publicClient.waitForTransactionReceipt({ hash: h });

      // the new sale id is nextSaleId - 1
      const next = (await publicClient.readContract({ address: IPO_ADDR, abi: FOOTBALL_IPO_ABI, functionName: "nextSaleId" })) as bigint;
      const saleId = Number(next) - 1;

      // 5. persist listing metadata (admin-gated server route)
      setStep("Saving listing…");
      const res = await fetch("/api/ipo/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId, playerToken: token, name: form.name, club: form.club, position: form.position, nat: form.nat }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Sale opened on-chain but saving metadata failed");
      }

      addToast({ variant: "success", title: "IPO created", description: `${form.name} · sale #${saleId} is live` });
      queryClient.invalidateQueries({ queryKey: ["ipos"] });
      setStep(null);
      return true;
    } catch (e) {
      const msg = (e as Error).message || "Failed to create IPO";
      if (!/reject|denied|cancell/i.test(msg)) {
        addToast({ variant: "error", title: "Couldn't create IPO", description: msg });
      }
      setStep(null);
      return false;
    }
  }

  return { addIpo, step, busy: step !== null };
}
