"use client";

import { useCallback, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/store";

/**
 * SIWE sign-in: fetch a server nonce + message, ask the wallet to sign it, then
 * POST the signature to be verified server-side (which issues an httpOnly
 * session cookie). No identity is ever written from the client.
 */
export function useSiwe() {
  const { address, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const setAuthenticated = useStore((s) => s.setAuthenticated);
  const addToast = useStore((s) => s.addToast);
  const queryClient = useQueryClient();
  const [signingIn, setSigningIn] = useState(false);

  const signIn = useCallback(async () => {
    if (!address) return;
    setSigningIn(true);
    try {
      const { message } = await fetch(
        `/api/auth/nonce?address=${address}&chainId=${chainId ?? 5042002}`
      ).then((r) => r.json());
      if (!message) throw new Error("Could not start sign-in");

      const signature = await signMessageAsync({ message });

      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Verification failed");
      }

      setAuthenticated(true);
      addToast({ variant: "success", title: "Signed in", description: "Wallet verified" });
      // refetch user-scoped data now that identity changed
      ["portfolio", "transactions", "watchlist", "notifications", "futures"].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] })
      );
    } catch (e) {
      const msg = (e as Error).message || "Sign-in cancelled";
      if (!/reject|denied|cancell/i.test(msg)) {
        addToast({ variant: "error", title: "Sign-in failed", description: msg });
      }
    } finally {
      setSigningIn(false);
    }
  }, [address, chainId, signMessageAsync, setAuthenticated, addToast, queryClient]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setAuthenticated(false);
    ["portfolio", "transactions", "watchlist", "notifications", "futures"].forEach((k) =>
      queryClient.invalidateQueries({ queryKey: [k] })
    );
  }, [setAuthenticated, queryClient]);

  return { signIn, signOut, signingIn };
}
