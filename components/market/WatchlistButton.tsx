"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";

export function WatchlistButton({
  playerId,
  initialWatching = false,
  fullWidth,
}: {
  playerId: string;
  initialWatching?: boolean;
  fullWidth?: boolean;
}) {
  const [watching, setWatching] = useState(initialWatching);
  const [loading, setLoading] = useState(false);
  const addToast = useStore((s) => s.addToast);
  const queryClient = useQueryClient();

  const toggle = async () => {
    setLoading(true);
    const next = !watching;
    setWatching(next);
    try {
      await fetch("/api/watchlist", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      addToast({
        variant: "success",
        title: next ? "Added to watchlist" : "Removed from watchlist",
      });
    } catch {
      setWatching(!next);
      addToast({ variant: "error", title: "Could not update watchlist" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="secondary"
      fullWidth={fullWidth}
      loading={loading}
      onClick={toggle}
      className={cn(watching && "border-gold/40 text-gold")}
    >
      <Star className={cn("h-4 w-4", watching && "fill-gold")} />
      {watching ? "Watching" : "Watchlist"}
    </Button>
  );
}
