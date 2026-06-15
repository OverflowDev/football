"use client";

import { useAccount } from "wagmi";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useSiwe } from "@/hooks/useSiwe";
import { useStore } from "@/store";

/**
 * Shown when a wallet is connected but no verified session exists. Clicking
 * runs the SIWE flow (wallet signature). Hidden when not connected (the
 * ConnectButton handles that) or already authenticated.
 */
export function SignInButton({ compact = false }: { compact?: boolean }) {
  const { isConnected } = useAccount();
  const authenticated = useStore((s) => s.authenticated);
  const { signIn, signingIn } = useSiwe();

  if (!isConnected) return null;

  if (authenticated) {
    return (
      <Badge variant="up" className="hidden sm:inline-flex">
        <ShieldCheck className="h-3 w-3" /> Verified
      </Badge>
    );
  }

  return (
    <Button size={compact ? "sm" : "md"} variant="gold" loading={signingIn} onClick={signIn}>
      <ShieldCheck className="h-4 w-4" /> Sign in
    </Button>
  );
}
