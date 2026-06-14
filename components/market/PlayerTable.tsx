"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ChevronDown, ChevronUp, Activity } from "lucide-react";
import { PlayerAvatar } from "@/components/shared/PlayerAvatar";
import { PriceTag } from "@/components/shared/PriceTag";
import { LivePrice } from "@/components/shared/LivePrice";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  POSITION_COLORS,
  cn,
  flagEmoji,
  formatCompactCurrency,
} from "@/lib/utils";
import type { Player } from "@/types";

type SortKey =
  | "rank"
  | "name"
  | "currentPrice"
  | "priceChangePercent24h"
  | "priceChangePercent7d"
  | "marketCap"
  | "volume24h";

export function PlayerTable({
  players,
  onTrade,
}: {
  players: Player[];
  onTrade?: (player: Player) => void;
}) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("marketCap");
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...players];
    arr.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sortKey === "name") {
        av = a.name;
        bv = b.name;
        return asc ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      av = (a[sortKey as keyof Player] as number) ?? 0;
      bv = (b[sortKey as keyof Player] as number) ?? 0;
      return asc ? av - bv : bv - av;
    });
    return arr;
  }, [players, sortKey, asc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc((s) => !s);
    else {
      setSortKey(key);
      setAsc(false);
    }
  };

  const SortHeader = ({ label, k, className }: { label: string; k: SortKey; className?: string }) => (
    <th className={cn("px-3 py-3 text-xs font-medium text-content-secondary", className)}>
      <button
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 hover:text-content"
      >
        {label}
        {sortKey === k ? (
          asc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  );

  return (
    <div className="overflow-x-auto card-surface bg-card">
      <table className="w-full min-w-[820px] text-left">
        <thead className="border-b border-white/5">
          <tr>
            <th className="px-3 py-3 text-xs font-medium text-content-secondary">#</th>
            <SortHeader label="Player" k="name" />
            <th className="px-3 py-3 text-xs font-medium text-content-secondary">Pos</th>
            <SortHeader label="Price" k="currentPrice" className="text-right" />
            <SortHeader label="24h" k="priceChangePercent24h" className="text-right" />
            <SortHeader label="7d" k="priceChangePercent7d" className="text-right" />
            <SortHeader label="Market Cap" k="marketCap" className="text-right" />
            <SortHeader label="Volume 24h" k="volume24h" className="text-right" />
            <th className="px-3 py-3 text-right text-xs font-medium text-content-secondary">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => (
            <tr
              key={p.id}
              onClick={() => router.push(`/market/${p.slug}`)}
              className="group cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.03]"
            >
              <td className="px-3 py-3 text-sm text-content-secondary">{i + 1}</td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <PlayerAvatar src={p.imageUrl} name={p.name} size="sm" />
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-content">
                      {p.name}
                      {p.injuryStatus && (
                        <Activity className="h-3 w-3 text-down" aria-label="Injured" />
                      )}
                    </p>
                    <p className="text-xs text-content-secondary">
                      {flagEmoji(p.nationalityCode)} {p.club.shortName} · {p.symbol}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3">
                <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-medium", POSITION_COLORS[p.position])}>
                  {p.position}
                </span>
              </td>
              <td className="px-3 py-3 text-right font-mono text-sm">
                <LivePrice playerId={p.id} fallback={p.currentPrice} />
              </td>
              <td className="px-3 py-3 text-right">
                <PriceTag value={p.priceChangePercent24h} />
              </td>
              <td className="px-3 py-3 text-right">
                <PriceTag value={p.priceChangePercent7d} showArrow={false} />
              </td>
              <td className="px-3 py-3 text-right font-mono text-sm text-content-secondary">
                {formatCompactCurrency(p.marketCap)}
              </td>
              <td className="px-3 py-3 text-right font-mono text-sm text-content-secondary">
                {formatCompactCurrency(p.volume24h)}
              </td>
              <td className="px-3 py-3 text-right">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onTrade) onTrade(p);
                    else router.push(`/market/${p.slug}`);
                  }}
                >
                  Trade
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
