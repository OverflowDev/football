import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";
import type { Player } from "@/types";

interface Driver {
  label: string;
  positive: boolean;
}

/**
 * Explains *why* a player's price is moving — derived from the same signals the
 * pricing engine uses (form, goals/assists, transfer rumors, injuries, demand).
 */
function deriveDrivers(player: Player): { drivers: Driver[]; sentiment: number } {
  const drivers: Driver[] = [];
  const s = player.stats;

  if (s.goals >= 5) drivers.push({ label: `${s.goals} goals this season`, positive: true });
  if (s.assists >= 4) drivers.push({ label: `${s.assists} assists`, positive: true });
  if (player.formRating >= 70) drivers.push({ label: `Hot form (${player.formRating.toFixed(0)}/100)`, positive: true });
  if (player.formRating <= 40) drivers.push({ label: `Poor recent form (${player.formRating.toFixed(0)}/100)`, positive: false });
  if (player.rumorScore >= 30) drivers.push({ label: "Strong transfer links", positive: true });
  else if (player.rumorScore >= 15) drivers.push({ label: "Transfer rumours circulating", positive: true });
  if (player.injuryStatus) drivers.push({ label: "Injury concern", positive: false });
  if (s.redCards > 0) drivers.push({ label: "Suspension risk (red card)", positive: false });
  if (player.age <= 21) drivers.push({ label: "Rising young talent", positive: true });
  if (player.priceChangePercent24h > 3) drivers.push({ label: "Strong buying demand (24h)", positive: true });
  if (player.priceChangePercent24h < -3) drivers.push({ label: "Selling pressure (24h)", positive: false });

  if (drivers.length === 0) {
    drivers.push({ label: "Trading on steady fundamentals", positive: player.priceChangePercent24h >= 0 });
  }

  const pos = drivers.filter((d) => d.positive).length;
  const sentiment = Math.round((pos / drivers.length) * 100);
  return { drivers, sentiment };
}

export function PriceDrivers({ player }: { player: Player }) {
  const { drivers, sentiment } = deriveDrivers(player);
  const up = player.priceChangePercent24h >= 0;

  return (
    <div className="card-surface bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
          <Activity className="h-4 w-4 text-primary" /> Price Drivers
        </h3>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs",
            up ? "price-up" : "price-down"
          )}
        >
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {formatPercent(player.priceChangePercent24h)} 24h
        </span>
      </div>

      {/* sentiment meter */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-[11px] text-content-secondary">
          <span className="text-up">Bullish {sentiment}%</span>
          <span className="text-down">Bearish {100 - sentiment}%</span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-down/30">
          <div className="h-full bg-up" style={{ width: `${sentiment}%` }} />
        </div>
      </div>

      <p className="mb-2 text-xs text-content-secondary">
        {up ? "Up" : "Down"} {formatPercent(Math.abs(player.priceChangePercent24h))} today because:
      </p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {drivers.map((d, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                d.positive ? "bg-up/15 text-up" : "bg-down/15 text-down"
              )}
            >
              {d.positive ? "+" : "−"}
            </span>
            <span className="text-content-secondary">{d.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
