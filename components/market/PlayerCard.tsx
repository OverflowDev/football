"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { PlayerAvatar } from "@/components/shared/PlayerAvatar";
import { PriceTag } from "@/components/shared/PriceTag";
import { LivePrice } from "@/components/shared/LivePrice";
import { Badge } from "@/components/ui/Badge";
import { MiniSparkline } from "@/components/market/MiniSparkline";
import { POSITION_COLORS, cn, flagEmoji, formatCompactCurrency } from "@/lib/utils";
import type { Player } from "@/types";

export function PlayerCard({ player }: { player: Player }) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 300 }}>
      <Link
        href={`/market/${player.slug}`}
        className="block card-surface bg-card p-4 transition-colors hover:border-primary/30"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <PlayerAvatar src={player.imageUrl} name={player.name} size="md" />
            <div>
              <p className="text-sm font-semibold text-content">{player.name}</p>
              <p className="flex items-center gap-1.5 text-xs text-content-secondary">
                <span>{flagEmoji(player.nationalityCode)}</span>
                {player.club.shortName}
                <span className={cn("rounded border px-1 text-[10px]", POSITION_COLORS[player.position])}>
                  {player.position}
                </span>
              </p>
            </div>
          </div>
          {player.injuryStatus && (
            <Badge variant="down" className="text-[10px]">
              <Activity className="h-3 w-3" /> INJ
            </Badge>
          )}
        </div>

        <div className="mt-3 h-10">
          <MiniSparkline playerId={player.id} positive={player.priceChangePercent24h >= 0} />
        </div>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="font-mono text-lg font-semibold">
              <LivePrice playerId={player.id} fallback={player.currentPrice} />
            </p>
            <p className="text-[11px] text-content-secondary">
              MCap {formatCompactCurrency(player.marketCap)}
            </p>
          </div>
          <PriceTag value={player.priceChangePercent24h} />
        </div>
      </Link>
    </motion.div>
  );
}
