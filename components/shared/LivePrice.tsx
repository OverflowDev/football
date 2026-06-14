"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/store";
import { cn, formatCurrency } from "@/lib/utils";

/**
 * Renders a player's price, preferring the realtime value from the store and
 * flashing green/red on each update.
 */
export function LivePrice({
  playerId,
  fallback,
  className,
}: {
  playerId: string;
  fallback: number;
  className?: string;
}) {
  const live = useStore((s) => s.livePrices[playerId]);
  const price = live?.price ?? fallback;
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevRef = useRef(price);

  useEffect(() => {
    if (price > prevRef.current) setFlash("up");
    else if (price < prevRef.current) setFlash("down");
    prevRef.current = price;
    const t = setTimeout(() => setFlash(null), 800);
    return () => clearTimeout(t);
  }, [price]);

  return (
    <span
      className={cn(
        "rounded font-mono tabular-nums transition-colors",
        flash === "up" && "animate-flash-up text-up",
        flash === "down" && "animate-flash-down text-down",
        className
      )}
    >
      {formatCurrency(price)}
    </span>
  );
}
