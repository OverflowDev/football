"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useStore } from "@/store";
import { useSiwe } from "@/hooks/useSiwe";

/**
 * Bridges the connected wallet to app state. It does NOT write any identity
 * cookie — identity is established only via the signed SIWE session
 * (see hooks/useSiwe + /api/auth/verify). Here we just mirror the address,
 * check whether a valid session exists, and clear it on disconnect.
 */
export function WalletSync() {
  const { address, isConnected } = useAccount();
  const setWalletAddress = useStore((s) => s.setWalletAddress);
  const setAuthenticated = useStore((s) => s.setAuthenticated);
  const { signOut } = useSiwe();
  const queryClient = useQueryClient();
  const wasConnected = useRef(false);

  useEffect(() => {
    const addr = isConnected && address ? address : null;
    setWalletAddress(addr);

    if (addr) {
      wasConnected.current = true;
      // does the server already recognise this session?
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((d) => setAuthenticated(!!d.authenticated))
        .catch(() => setAuthenticated(false));
    } else if (wasConnected.current) {
      // wallet disconnected → drop the server session too
      wasConnected.current = false;
      signOut();
    }

    queryClient.invalidateQueries({ queryKey: ["portfolio"] });
  }, [address, isConnected, setWalletAddress, setAuthenticated, signOut, queryClient]);

  return null;
}
