"use client";

import { useMemo, useState } from "react";
import { Search, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { PlayerTable } from "@/components/market/PlayerTable";
import { PlayerCard } from "@/components/market/PlayerCard";
import { TradeModal } from "@/components/market/TradeModal";
import { MarketStats } from "@/components/market/MarketStats";
import { usePlayers } from "@/hooks/usePlayer";
import { useApi } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import type { MarketStats as MarketStatsType, Player, Position } from "@/types";

const POSITIONS: (Position | "ALL")[] = ["ALL", "GK", "DEF", "MID", "FWD"];
const LEAGUES = ["All", "Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1", "IPO"];
const SHOWS = ["All", "Gainers", "Losers", "Most Traded"] as const;

export default function MarketPage() {
  const { data, isLoading } = usePlayers();
  const { data: statsData } = useApi<{ stats: MarketStatsType }>(["market-stats"], "/api/market/stats");
  const players = useMemo(() => data?.players ?? [], [data]);

  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<(typeof POSITIONS)[number]>("ALL");
  const [league, setLeague] = useState("All");
  const [show, setShow] = useState<(typeof SHOWS)[number]>("All");
  const [view, setView] = useState<"table" | "grid">("table");
  const [tradePlayer, setTradePlayer] = useState<Player | null>(null);

  const filtered = useMemo(() => {
    let list = [...players];
    if (position !== "ALL") list = list.filter((p) => p.position === position);
    if (league !== "All") list = list.filter((p) => p.club.league === league);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.symbol.toLowerCase().includes(q) ||
          p.club.name.toLowerCase().includes(q)
      );
    }
    if (show === "Gainers") list = list.filter((p) => p.priceChangePercent24h > 0);
    if (show === "Losers") list = list.filter((p) => p.priceChangePercent24h < 0);
    if (show === "Most Traded") list.sort((a, b) => b.volume24h - a.volume24h);
    return list;
  }, [players, position, league, search, show]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Market</h1>
        <p className="text-sm text-content-secondary">
          {filtered.length} players · trade shares like stocks
        </p>
      </div>

      {statsData && <MarketStats stats={statsData.stats} />}

      {/* filters */}
      <div className="space-y-3">
        <Input
          leftIcon={<Search className="h-4 w-4" />}
          placeholder="Search players, clubs, tickers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <FilterGroup options={POSITIONS} value={position} onChange={(v) => setPosition(v as Position | "ALL")} />
          <span className="hidden h-5 w-px bg-white/10 sm:block" />
          <FilterGroup options={SHOWS as unknown as string[]} value={show} onChange={(v) => setShow(v as (typeof SHOWS)[number])} />
          <div className="ml-auto flex items-center gap-2">
            <select
              value={league}
              onChange={(e) => setLeague(e.target.value)}
              className="h-9 rounded-lg border border-white/10 bg-surface px-3 text-sm text-content focus:border-primary/50 focus:outline-none"
            >
              {LEAGUES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <div className="inline-flex rounded-lg border border-white/10 p-0.5">
              <button
                onClick={() => setView("table")}
                className={cn("rounded-md p-1.5", view === "table" ? "bg-white/10" : "text-content-secondary")}
                aria-label="Table view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("grid")}
                className={cn("rounded-md p-1.5", view === "grid" ? "bg-white/10" : "text-content-secondary")}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* content */}
      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : view === "table" ? (
        <PlayerTable players={filtered} onTrade={setTradePlayer} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <PlayerCard key={p.id} player={p} />
          ))}
        </div>
      )}

      <TradeModal player={tradePlayer} open={!!tradePlayer} onClose={() => setTradePlayer(null)} />
    </div>
  );
}

function FilterGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-white/10 p-0.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === o ? "bg-primary/20 text-primary" : "text-content-secondary hover:text-content"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
