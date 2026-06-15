"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/hooks/useApi";
import { useStore } from "@/store";
import type { FuturesPosition, FuturesResult, FuturesSide } from "@/types";

export function useFuturesPositions() {
  return useQuery({
    queryKey: ["futures"],
    queryFn: () => fetcher<{ positions: FuturesPosition[] }>("/api/futures"),
    refetchInterval: 10000,
  });
}

export function useOpenFuture() {
  const queryClient = useQueryClient();
  const addToast = useStore((s) => s.addToast);
  return useMutation<
    FuturesResult,
    Error,
    { playerId: string; side: FuturesSide; size: number; leverage: number }
  >({
    mutationFn: async (vars) => {
      const res = await fetch("/api/futures/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      });
      const data = (await res.json()) as FuturesResult;
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to open position");
      return data;
    },
    onSuccess: (_d, vars) => {
      addToast({
        variant: "success",
        title: `Opened ${vars.leverage}x ${vars.side.toLowerCase()}`,
        description: `${vars.size} shares`,
      });
      queryClient.invalidateQueries({ queryKey: ["futures"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
    onError: (e) => addToast({ variant: "error", title: "Couldn't open position", description: e.message }),
  });
}

export function useCloseFuture() {
  const queryClient = useQueryClient();
  const addToast = useStore((s) => s.addToast);
  return useMutation<FuturesResult, Error, { positionId: string }>({
    mutationFn: async (vars) => {
      const res = await fetch("/api/futures/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      });
      const data = (await res.json()) as FuturesResult;
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to close position");
      return data;
    },
    onSuccess: (data) => {
      const pnl = data.realizedPnl ?? 0;
      addToast({
        variant: pnl >= 0 ? "success" : "info",
        title: "Position closed",
        description: `Realized P&L £${pnl.toFixed(2)}`,
      });
      queryClient.invalidateQueries({ queryKey: ["futures"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
    onError: (e) => addToast({ variant: "error", title: "Couldn't close position", description: e.message }),
  });
}
