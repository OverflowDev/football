// Trade execution. Handles virtual trades against the demo store or Prisma,
// applies the 0.5% fee + bonding-curve price impact, and records the tx.

import { hasDatabase } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { marketData } from "@/lib/market-data";
import { demoApplyTrade, demoState } from "@/lib/demo-store";
import { applyBondingCurve, BONDING_CURVE_STEP } from "@/lib/pricing-engine";
import { TRADING_FEE_RATE } from "@/lib/utils";
import type { ApiUser, Player, TradeResult } from "@/types";

interface ExecuteArgs {
  user: ApiUser;
  playerId: string;
  shares: number;
  side: "BUY" | "SELL";
  isOnChain: boolean;
}

export async function executeTrade({
  user,
  playerId,
  shares,
  side,
  isOnChain,
}: ExecuteArgs): Promise<TradeResult> {
  const player = await marketData.getPlayerById(playerId);
  if (!player) return { success: false, error: "Player not found" };
  if (shares <= 0) return { success: false, error: "Invalid share quantity" };

  // live price snapshot (store reflects the realtime simulator on the client;
  // on the server we use the canonical price)
  const price = player.currentPrice;
  const subtotal = Math.round(shares * price * 100) / 100;
  const fee = Math.round(subtotal * TRADING_FEE_RATE * 100) / 100;
  const total = subtotal;

  // bonding-curve next price after this order
  const signed = side === "BUY" ? shares : -shares;
  const newPrice = Math.round(applyBondingCurve(price, signed) * 100) / 100;

  // ---- DB path ----
  if (hasDatabase && user.id !== "demo-user") {
    return executeDbTrade({ user, player, shares, side, price, fee, total, newPrice, isOnChain });
  }

  // ---- DEMO path ----
  const state = demoState();
  if (side === "BUY") {
    if (total + fee > state.balance) {
      return { success: false, error: "Insufficient balance" };
    }
  } else {
    const holding = state.holdings.get(playerId);
    if (!holding || holding.shares < shares) {
      return { success: false, error: "Not enough shares to sell" };
    }
  }

  const tx = demoApplyTrade(playerId, side, shares, price, fee, total, isOnChain);
  return {
    success: true,
    transaction: tx,
    newBalance: demoState().balance,
    newPrice,
  };
}

async function executeDbTrade(args: {
  user: ApiUser;
  player: Player;
  shares: number;
  side: "BUY" | "SELL";
  price: number;
  fee: number;
  total: number;
  newPrice: number;
  isOnChain: boolean;
}): Promise<TradeResult> {
  const { user, player, shares, side, price, fee, total, newPrice, isOnChain } = args;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const dbUser = await tx.user.findUnique({ where: { id: user.id } });
      if (!dbUser) throw new Error("User not found");
      const balance = Number(dbUser.virtualBalance);

      const holding = await tx.portfolio.findUnique({
        where: { userId_playerId: { userId: user.id, playerId: player.id } },
      });

      if (side === "BUY") {
        if (total + fee > balance) throw new Error("Insufficient balance");
        const newShares = (holding?.shares ?? 0) + shares;
        const newInvested = Number(holding?.totalInvested ?? 0) + total;
        await tx.portfolio.upsert({
          where: { userId_playerId: { userId: user.id, playerId: player.id } },
          create: {
            userId: user.id,
            playerId: player.id,
            shares,
            averageBuyPrice: price,
            totalInvested: total,
          },
          update: {
            shares: newShares,
            averageBuyPrice: newInvested / newShares,
            totalInvested: newInvested,
          },
        });
        await tx.user.update({
          where: { id: user.id },
          data: { virtualBalance: balance - total - fee },
        });
      } else {
        if (!holding || holding.shares < shares) throw new Error("Not enough shares");
        const remaining = holding.shares - shares;
        if (remaining <= 0) {
          await tx.portfolio.delete({
            where: { userId_playerId: { userId: user.id, playerId: player.id } },
          });
        } else {
          await tx.portfolio.update({
            where: { userId_playerId: { userId: user.id, playerId: player.id } },
            data: {
              shares: remaining,
              totalInvested: Number(holding.averageBuyPrice) * remaining,
            },
          });
        }
        await tx.user.update({
          where: { id: user.id },
          data: { virtualBalance: balance + total - fee },
        });
      }

      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          playerId: player.id,
          type: side,
          shares,
          pricePerShare: price,
          totalAmount: total,
          fee,
          isOnChain,
        },
      });

      // record price movement from the bonding curve
      await tx.player.update({
        where: { id: player.id },
        data: { previousPrice: price, currentPrice: newPrice },
      });
      await tx.priceHistory.create({
        data: { playerId: player.id, price: newPrice, volume: shares, triggerReason: "MARKET_DEMAND" },
      });

      const refreshed = await tx.user.findUnique({ where: { id: user.id } });
      return { transaction, newBalance: Number(refreshed?.virtualBalance ?? 0) };
    });

    return {
      success: true,
      transaction: {
        id: result.transaction.id,
        playerId: player.id,
        playerName: player.name,
        playerSymbol: player.symbol,
        type: side,
        shares,
        pricePerShare: price,
        totalAmount: total,
        fee,
        isOnChain,
        txHash: null,
        createdAt: result.transaction.createdAt.toISOString(),
      },
      newBalance: result.newBalance,
      newPrice,
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// re-export so callers don't import the constant from two places
export { BONDING_CURVE_STEP };
