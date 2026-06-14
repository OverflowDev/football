"use client";

import { useEffect } from "react";
import { usePlayers } from "@/hooks/usePlayer";
import { useSocket } from "@/hooks/useSocket";
import { useStore } from "@/store";
import { WalletSync } from "@/components/providers/WalletSync";

/**
 * Hydrates the global store with players from the API, syncs the connected
 * wallet identity, and starts the realtime price feed. Renders nothing visible.
 */
export function StoreBootstrap() {
  const setPlayers = useStore((s) => s.setPlayers);
  const { data } = usePlayers();

  useEffect(() => {
    if (data?.players) setPlayers(data.players);
  }, [data, setPlayers]);

  useSocket();
  return <WalletSync />;
}
