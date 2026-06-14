"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useStore } from "@/store";

const WALLET_COOKIE = "fpi_wallet";

function setWalletCookie(address: string | null) {
  if (typeof document === "undefined") return;
  if (address) {
    // 30-day, lax cookie — read server-side to resolve the current user.
    document.cookie = `${WALLET_COOKIE}=${address.toLowerCase()}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  } else {
    document.cookie = `${WALLET_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }
}

/**
 * Bridges the connected wallet (wagmi) to the rest of the app:
 *  - mirrors the address into the Zustand store
 *  - writes the `fpi_wallet` cookie so API routes / server components can
 *    resolve the user (see lib/session.ts)
 *  - links the address to the DB user and refetches user-scoped data
 * Renders nothing.
 */
export function WalletSync() {
  const { address, isConnected } = useAccount();
  const setWalletAddress = useStore((s) => s.setWalletAddress);
  const queryClient = useQueryClient();

  useEffect(() => {
    const addr = isConnected && address ? address : null;
    setWalletAddress(addr);
    setWalletCookie(addr);

    if (addr) {
      fetch("/api/user/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: addr }),
      }).catch(() => null);
    }

    // re-fetch anything user-scoped now that identity changed
    queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [address, isConnected, setWalletAddress, queryClient]);

  return null;
}
