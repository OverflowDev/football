// Virtual leveraged futures on player prices: long/short with leverage,
// margin, P&L and liquidation. Mirrors lib/trade.ts (DB path + demo path).

import { hasDatabase } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { marketData } from "@/lib/market-data";
import { demoState, demoOpenFuture, demoCloseFuture } from "@/lib/demo-store";
import { TRADING_FEE_RATE } from "@/lib/utils";
import {
  MAX_LEVERAGE,
  MIN_LEVERAGE,
  decoratePosition,
  liquidationPrice,
  positionPnl,
} from "@/lib/futures-math";
import type { ApiUser, FuturesPosition, FuturesResult, FuturesSide } from "@/types";

export { MAX_LEVERAGE, MIN_LEVERAGE, liquidationPrice, positionPnl, decoratePosition };

interface OpenArgs {
  user: ApiUser;
  playerId: string;
  side: FuturesSide;
  size: number;
  leverage: number;
}

export async function openPosition({
  user,
  playerId,
  side,
  size,
  leverage,
}: OpenArgs): Promise<FuturesResult> {
  const player = await marketData.getPlayerById(playerId);
  if (!player) return { success: false, error: "Player not found" };
  if (size <= 0) return { success: false, error: "Invalid size" };
  if (leverage < MIN_LEVERAGE || leverage > MAX_LEVERAGE) {
    return { success: false, error: `Leverage must be ${MIN_LEVERAGE}–${MAX_LEVERAGE}x` };
  }

  const entry = player.currentPrice;
  const notional = Math.round(size * entry * 100) / 100;
  const margin = Math.round((notional / leverage) * 100) / 100;
  const fee = Math.round(notional * TRADING_FEE_RATE * 100) / 100;
  const liq = liquidationPrice(entry, side, leverage);
  const cost = margin + fee;

  if (hasDatabase && user.id !== "demo-user") {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const dbUser = await tx.user.findUnique({ where: { id: user.id } });
        if (!dbUser) throw new Error("User not found");
        const balance = Number(dbUser.virtualBalance);
        if (cost > balance) throw new Error("Insufficient balance for margin + fee");

        const pos = await tx.futuresPosition.create({
          data: {
            userId: user.id,
            playerId,
            side,
            size,
            leverage,
            entryPrice: entry,
            margin,
            liquidationPrice: liq,
            fee,
            status: "OPEN",
          },
        });
        const updated = await tx.user.update({
          where: { id: user.id },
          data: { virtualBalance: balance - cost },
        });
        return { pos, balance: Number(updated.virtualBalance) };
      });
      return {
        success: true,
        position: decoratePosition({
          id: result.pos.id,
          playerId,
          side,
          size,
          leverage,
          entryPrice: entry,
          margin,
          liquidationPrice: liq,
          status: "OPEN",
          openedAt: result.pos.openedAt.toISOString(),
        })!,
        newBalance: result.balance,
      };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }

  // demo path
  const state = demoState();
  if (cost > state.balance) {
    return { success: false, error: "Insufficient balance for margin + fee" };
  }
  const pos = demoOpenFuture({ playerId, side, size, leverage, entryPrice: entry, margin, liquidationPrice: liq, fee });
  return {
    success: true,
    position: decoratePosition({ ...pos })!,
    newBalance: demoState().balance,
  };
}

export async function closePosition(user: ApiUser, positionId: string): Promise<FuturesResult> {
  if (hasDatabase && user.id !== "demo-user") {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const pos = await tx.futuresPosition.findUnique({ where: { id: positionId } });
        if (!pos || pos.userId !== user.id) throw new Error("Position not found");
        if (pos.status !== "OPEN") throw new Error("Position already closed");

        // mark price from the active provider (read before mutating)
        const player = await marketData.getPlayerById(pos.playerId);
        const mark = player?.currentPrice ?? Number(pos.entryPrice);
        const side = pos.side as FuturesSide;
        const margin = Number(pos.margin);
        const liq = Number(pos.liquidationPrice);

        // liquidation check
        const liquidated =
          (side === "LONG" && mark <= liq) || (side === "SHORT" && mark >= liq);
        let pnl = positionPnl(side, Number(pos.entryPrice), mark, pos.size);
        pnl = Math.max(pnl, -margin); // can't lose more than margin
        const fee = Math.round(Number(pos.fee) * 100) / 100; // exit fee ~ entry fee
        const payout = liquidated ? 0 : Math.max(0, margin + pnl - fee);

        const dbUser = await tx.user.findUnique({ where: { id: user.id } });
        const balance = Number(dbUser?.virtualBalance ?? 0);

        await tx.futuresPosition.update({
          where: { id: positionId },
          data: {
            status: liquidated ? "LIQUIDATED" : "CLOSED",
            closePrice: mark,
            realizedPnl: liquidated ? -margin : pnl,
            closedAt: new Date(),
          },
        });
        const updated = await tx.user.update({
          where: { id: user.id },
          data: { virtualBalance: balance + payout },
        });
        return { realizedPnl: liquidated ? -margin : pnl, balance: Number(updated.virtualBalance) };
      });
      return { success: true, realizedPnl: result.realizedPnl, newBalance: result.balance };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }

  // demo path
  const res = demoCloseFuture(positionId);
  if (!res) return { success: false, error: "Position not found" };
  return { success: true, realizedPnl: res.realizedPnl, newBalance: demoState().balance };
}

export async function listPositions(user: ApiUser): Promise<FuturesPosition[]> {
  // Live mark prices from the active provider (DB in prod), keyed by playerId.
  const players = await marketData.getPlayers();
  const priceById = new Map(players.map((p) => [p.id, p.currentPrice]));

  if (hasDatabase && user.id !== "demo-user") {
    const rows = await prisma.futuresPosition.findMany({
      where: { userId: user.id, status: "OPEN" },
      orderBy: { openedAt: "desc" },
    });
    return rows
      .map((r) =>
        decoratePosition(
          {
            id: r.id,
            playerId: r.playerId,
            side: r.side as FuturesSide,
            size: r.size,
            leverage: r.leverage,
            entryPrice: Number(r.entryPrice),
            margin: Number(r.margin),
            liquidationPrice: Number(r.liquidationPrice),
            status: "OPEN",
            openedAt: r.openedAt.toISOString(),
          },
          priceById.get(r.playerId)
        )
      )
      .filter((p): p is FuturesPosition => p !== null);
  }

  return demoState()
    .futures.filter((f) => f.status === "OPEN")
    .map((f) => decoratePosition({ ...f }, priceById.get(f.playerId)))
    .filter((p): p is FuturesPosition => p !== null);
}
