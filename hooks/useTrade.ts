"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/store";
import type { TradeResult, TradeMode } from "@/types";

interface TradeArgs {
  playerId: string;
  shares: number;
  mode: TradeMode;
  side: "BUY" | "SELL";
}

export function useTrade() {
  const queryClient = useQueryClient();
  const addToast = useStore((s) => s.addToast);

  return useMutation<TradeResult, Error, TradeArgs>({
    mutationFn: async ({ playerId, shares, mode, side }) => {
      const res = await fetch(`/api/trade/${side.toLowerCase()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, shares, mode }),
      });
      const data = (await res.json()) as TradeResult;
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Trade failed");
      }
      return data;
    },
    onSuccess: (data, vars) => {
      addToast({
        variant: "success",
        title: `${vars.side === "BUY" ? "Bought" : "Sold"} ${vars.shares} shares`,
        description: data.transaction
          ? `${data.transaction.playerSymbol} @ £${data.transaction.pricePerShare.toFixed(2)}`
          : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (err) => {
      addToast({ variant: "error", title: "Trade failed", description: err.message });
    },
  });
}
