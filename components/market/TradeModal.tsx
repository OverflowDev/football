"use client";

import { Modal } from "@/components/ui/Modal";
import { TradePanel } from "@/components/market/TradePanel";
import { PlayerAvatar } from "@/components/shared/PlayerAvatar";
import { PriceTag } from "@/components/shared/PriceTag";
import { LivePrice } from "@/components/shared/LivePrice";
import type { Player } from "@/types";

export function TradeModal({
  player,
  open,
  onClose,
}: {
  player: Player | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!player) return null;
  return (
    <Modal open={open} onClose={onClose} title={`Trade ${player.symbol}`}>
      <div className="mb-4 flex items-center gap-3">
        <PlayerAvatar src={player.imageUrl} name={player.name} size="lg" />
        <div>
          <p className="font-display text-lg font-semibold">{player.name}</p>
          <p className="text-sm text-content-secondary">
            {player.club.name} · {player.position}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="font-mono text-lg font-semibold">
            <LivePrice playerId={player.id} fallback={player.currentPrice} />
          </p>
          <PriceTag value={player.priceChangePercent24h} />
        </div>
      </div>
      <div className="-mx-1">
        <TradePanel player={player} />
      </div>
    </Modal>
  );
}
