"use client";

import { useApi } from "@/hooks/useApi";
import type { NewsItem, Player, PricePoint, Transaction } from "@/types";

export function usePlayers() {
  return useApi<{ players: Player[] }>(["players"], "/api/players");
}

export function usePlayer(slug: string) {
  return useApi<{ player: Player }>(["player", slug], `/api/players/${slug}`);
}

export function usePriceHistory(playerId: string, range: string) {
  return useApi<{ history: PricePoint[] }>(
    ["price-history", playerId, range],
    `/api/players/${playerId}/price-history?range=${range}`
  );
}

export function usePlayerNews(playerId: string) {
  return useApi<{ news: NewsItem[] }>(
    ["player-news", playerId],
    `/api/players/${playerId}/news`
  );
}

export function useRecentTrades(playerId: string) {
  return useApi<{ trades: Transaction[] }>(
    ["recent-trades", playerId],
    `/api/players/${playerId}/trades`,
    8000
  );
}
