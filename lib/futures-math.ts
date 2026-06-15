// Pure, client-safe futures math (no server/Prisma imports).

import { getPlayerById } from "@/lib/mock-data";
import type { FuturesPosition, FuturesSide } from "@/types";

export const MAX_LEVERAGE = 10;
export const MIN_LEVERAGE = 1;

/** Liquidation price for a position (maintenance margin ignored for MVP). */
export function liquidationPrice(entry: number, side: FuturesSide, leverage: number): number {
  const frac = 1 / leverage;
  const p = side === "LONG" ? entry * (1 - frac) : entry * (1 + frac);
  return Math.max(0, Math.round(p * 100) / 100);
}

/** Unrealized P&L in currency for `size` shares. */
export function positionPnl(side: FuturesSide, entry: number, mark: number, size: number): number {
  const diff = side === "LONG" ? mark - entry : entry - mark;
  return Math.round(diff * size * 100) / 100;
}

/**
 * Decorate a raw position with mark price + P&L for the UI. Pass `markPrice`
 * (from the active data provider — DB in prod) for an accurate live mark;
 * falls back to the mock player price only when none is supplied.
 */
export function decoratePosition(
  raw: {
    id: string;
    playerId: string;
    side: FuturesSide;
    size: number;
    leverage: number;
    entryPrice: number;
    margin: number;
    liquidationPrice: number;
    status: FuturesPosition["status"];
    openedAt: string;
  },
  markPrice?: number
): FuturesPosition | null {
  const player = getPlayerById(raw.playerId);
  if (!player) return null;
  const mark = markPrice ?? player.currentPrice;
  const pnl = positionPnl(raw.side, raw.entryPrice, mark, raw.size);
  const pnlPercent = raw.margin > 0 ? Math.round((pnl / raw.margin) * 10000) / 100 : 0;
  return {
    id: raw.id,
    playerId: raw.playerId,
    player,
    side: raw.side,
    size: raw.size,
    leverage: raw.leverage,
    entryPrice: raw.entryPrice,
    markPrice: mark,
    margin: raw.margin,
    liquidationPrice: raw.liquidationPrice,
    notional: Math.round(raw.size * raw.entryPrice * 100) / 100,
    unrealizedPnl: pnl,
    pnlPercent,
    status: raw.status,
    openedAt: raw.openedAt,
  };
}
