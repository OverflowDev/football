"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { MiniSparkline } from "@/components/market/MiniSparkline";
import { PriceTag } from "@/components/shared/PriceTag";
import { getAllPlayers } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

/** Floating glass "live market" panel — the unique hero centerpiece. */
export function HeroPreview() {
  const players = getAllPlayers()
    .slice()
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-md"
      style={{ perspective: 1200 }}
    >
      {/* glow */}
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-primary/20 blur-3xl" />

      <div className="animate-float glass rounded-2xl p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-up" />
            </span>
            <span className="text-sm font-semibold">Live Market</span>
          </div>
          <span className="flex items-center gap-1 text-xs text-content-secondary">
            <Activity className="h-3.5 w-3.5 text-primary" /> soka · Arc
          </span>
        </div>

        <div className="space-y-1">
          {players.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/5"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                {p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="text-[11px] text-content-secondary">{p.symbol}</p>
              </div>
              <div className="h-7 w-16 opacity-90">
                <MiniSparkline playerId={p.id} positive={p.priceChangePercent24h >= 0} />
              </div>
              <div className="w-24 text-right">
                <p className="font-mono text-sm tabular-nums">{formatCurrency(p.currentPrice)}</p>
                <PriceTag value={p.priceChangePercent24h} showArrow={false} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
