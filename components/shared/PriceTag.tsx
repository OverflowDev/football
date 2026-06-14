"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent, priceDirection } from "@/lib/utils";

/**
 * Shows a percentage (or value) change with directional color + arrow.
 */
export function PriceTag({
  value,
  isCurrency = false,
  showArrow = true,
  className,
  size = "sm",
}: {
  value: number;
  isCurrency?: boolean;
  showArrow?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dir = priceDirection(value);
  const sizes = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-2.5 py-1",
  };
  const label = isCurrency
    ? `${value > 0 ? "+" : value < 0 ? "-" : ""}£${Math.abs(value).toFixed(2)}`
    : formatPercent(value);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md font-mono font-medium",
        sizes[size],
        dir === "up" && "price-up",
        dir === "down" && "price-down",
        dir === "flat" && "bg-white/5 text-content-secondary",
        className
      )}
    >
      {showArrow && dir === "up" && <ArrowUpRight className="h-3 w-3" />}
      {showArrow && dir === "down" && <ArrowDownRight className="h-3 w-3" />}
      {label}
    </span>
  );
}
