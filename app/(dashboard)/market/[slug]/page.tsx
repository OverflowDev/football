import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchPlayer } from "@/lib/data";
import { PlayerAvatar } from "@/components/shared/PlayerAvatar";
import { PriceTag } from "@/components/shared/PriceTag";
import { LivePrice } from "@/components/shared/LivePrice";
import { Badge } from "@/components/ui/Badge";
import { PriceChart } from "@/components/market/PriceChart";
import { PriceDrivers } from "@/components/market/PriceDrivers";
import { PlayerTabs } from "@/components/market/PlayerTabs";
import { TradePanel } from "@/components/market/TradePanel";
import { OrderBook } from "@/components/market/OrderBook";
import { WatchlistButton } from "@/components/market/WatchlistButton";
import { PriceAlertButton } from "@/components/market/PriceAlertButton";
import {
  POSITION_LABELS,
  flagEmoji,
  formatCompactCurrency,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const player = await fetchPlayer(params.slug);
  return { title: player ? `${player.name} (${player.symbol}) · FPI` : "Player · FPI" };
}

export default async function PlayerPage({ params }: { params: { slug: string } }) {
  const player = await fetchPlayer(params.slug);
  if (!player) notFound();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* LEFT */}
      <div className="space-y-5 lg:col-span-2">
        {/* header */}
        <div className="card-surface bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <PlayerAvatar src={player.imageUrl} name={player.name} size="xl" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-bold">{player.name}</h1>
                  <span className="font-mono text-sm text-content-secondary">{player.symbol}</span>
                </div>
                <p className="mt-1 flex items-center gap-2 text-sm text-content-secondary">
                  <span>{flagEmoji(player.nationalityCode)} {player.nationality}</span>
                  <span>·</span>
                  <span>{player.club.name}</span>
                  <Badge variant="primary">{POSITION_LABELS[player.position]}</Badge>
                  {player.injuryStatus && <Badge variant="down">Injured</Badge>}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-display text-3xl font-bold">
                <LivePrice playerId={player.id} fallback={player.currentPrice} />
              </p>
              <div className="mt-1 flex items-center justify-end gap-2">
                <PriceTag value={player.priceChange24h} isCurrency size="md" />
                <PriceTag value={player.priceChangePercent24h} size="md" />
              </div>
              <p className="mt-1 text-xs text-content-secondary">
                MCap {formatCompactCurrency(player.marketCap)} · Vol {formatCompactCurrency(player.volume24h)}
              </p>
            </div>
          </div>
        </div>

        {/* chart */}
        <PriceChart playerId={player.id} positive={player.priceChangePercent24h >= 0} />

        {/* why is it moving */}
        <PriceDrivers player={player} />

        {/* tabs */}
        <div className="card-surface bg-card p-5">
          <PlayerTabs player={player} />
        </div>
      </div>

      {/* RIGHT */}
      <div className="space-y-4">
        <div className="lg:sticky lg:top-20">
          <TradePanel player={player} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <WatchlistButton playerId={player.id} fullWidth />
            <PriceAlertButton player={player} fullWidth />
          </div>
        </div>
        <OrderBook playerId={player.id} />
      </div>
    </div>
  );
}
