"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { useStore } from "@/store";

/**
 * Subscribes to realtime price updates. When a Socket.io server URL is
 * configured it listens to the live feed; otherwise it runs a deterministic
 * in-browser simulator so price flashes/animations work zero-config.
 */
export function useSocket() {
  const setLivePrice = useStore((s) => s.setLivePrice);
  const players = useStore((s) => s.players);

  useEffect(() => {
    const socket = getSocket();

    if (socket) {
      const onPrice = (p: {
        playerId: string;
        newPrice: number;
        changePercent: number;
      }) => setLivePrice(p.playerId, p.newPrice, p.changePercent);
      const onTicker = (
        entries: { playerId: string; price: number; changePercent: number }[]
      ) => entries.forEach((e) => setLivePrice(e.playerId, e.price, e.changePercent));

      socket.on("price:update", onPrice);
      socket.on("market:ticker", onTicker);
      return () => {
        socket.off("price:update", onPrice);
        socket.off("market:ticker", onTicker);
      };
    }

    // ---- local simulator ----
    if (players.length === 0) return;
    const last: Record<string, number> = {};
    players.forEach((p) => (last[p.id] = p.currentPrice));

    const interval = setInterval(() => {
      // tick a handful of random players each cycle
      for (let i = 0; i < 4; i++) {
        const p = players[Math.floor(Math.random() * players.length)];
        if (!p) continue;
        const old = last[p.id] ?? p.currentPrice;
        const drift = (Math.random() - 0.5) * 0.012;
        const next = Math.max(0.5, Math.round(old * (1 + drift) * 100) / 100);
        last[p.id] = next;
        const changePercent =
          p.previousPrice > 0 ? ((next - p.previousPrice) / p.previousPrice) * 100 : 0;
        setLivePrice(p.id, next, Math.round(changePercent * 100) / 100);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [players, setLivePrice]);
}
