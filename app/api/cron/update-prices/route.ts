import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { hasDatabase } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { getLatestPlayerStats } from "@/lib/football-api";
import { calculateNewPrice } from "@/lib/pricing-engine";
import { getAllPlayers } from "@/lib/mock-data";
import { pushPricesOnChain, toUsdc6, type OnChainPriceUpdate } from "@/lib/oracle";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Runs every 30 min (Vercel Cron).
 * 1. Fetch latest match data
 * 2. Run the pricing engine per active player
 * 3. Persist new prices + price history
 * 4. Push new prices on-chain (oracle) for tokenized players
 * 5. Check & trigger price alerts
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await getLatestPlayerStats();
  const statsByApiId = new Map(stats.map((s) => [s.apiFootballId, s]));
  const players = getAllPlayers();
  const updates: { id: string; oldPrice: number; newPrice: number; reason: string }[] = [];
  const onChain: OnChainPriceUpdate[] = [];

  for (const player of players) {
    const s = statsByApiId.get(player.apiFootballId);
    const result = calculateNewPrice(player.currentPrice, {
      age: player.age,
      goals: s?.goals ?? 0,
      assists: s?.assists ?? 0,
      rating: s?.rating ?? player.stats.rating,
      redCard: s?.redCard ?? false,
      injuryConfirmed: s?.injured ?? player.injuryStatus,
      // light demand noise so prices drift each cycle
      buys: Math.round(Math.random() * 50),
      sells: Math.round(Math.random() * 50),
    });

    updates.push({
      id: player.id,
      oldPrice: result.oldPrice,
      newPrice: result.newPrice,
      reason: result.triggerReason,
    });

    // queue on-chain price update for tokenized players
    if (player.contractAddress) {
      onChain.push({
        token: player.contractAddress as `0x${string}`,
        price: toUsdc6(result.newPrice),
      });
    }

    if (hasDatabase) {
      await prisma.player
        .update({
          where: { id: player.id },
          data: {
            previousPrice: result.oldPrice,
            currentPrice: result.newPrice,
            priceChange24h: result.newPrice - result.oldPrice,
            priceChangePercent24h: result.changePercent,
          },
        })
        .catch(() => null);
      await prisma.priceHistory
        .create({
          data: {
            playerId: player.id,
            price: result.newPrice,
            volume: 0,
            triggerReason: result.triggerReason,
          },
        })
        .catch(() => null);
    }
  }

  // Trigger price alerts (DB only)
  let triggered = 0;
  if (hasDatabase) {
    const alerts = await prisma.priceAlert.findMany({ where: { isTriggered: false } }).catch(() => []);
    const priceById = new Map(updates.map((u) => [u.id, u.newPrice]));
    for (const alert of alerts) {
      const price = priceById.get(alert.playerId);
      if (price === undefined) continue;
      const hit =
        (alert.direction === "ABOVE" && price >= Number(alert.targetPrice)) ||
        (alert.direction === "BELOW" && price <= Number(alert.targetPrice));
      if (hit) {
        triggered++;
        await prisma.priceAlert.update({ where: { id: alert.id }, data: { isTriggered: true } });
        await prisma.notification.create({
          data: {
            userId: alert.userId,
            type: "PRICE_ALERT",
            title: "Price alert triggered",
            message: `Target £${Number(alert.targetPrice).toFixed(2)} ${alert.direction.toLowerCase()} reached.`,
            playerId: alert.playerId,
          },
        });
      }
    }
  }

  // Push prices on-chain for tokenized players (no-op if oracle not configured)
  const oracle = await pushPricesOnChain(onChain);

  return NextResponse.json({
    ok: true,
    updated: updates.length,
    alertsTriggered: triggered,
    persisted: hasDatabase,
    onChain: oracle,
    sample: updates.slice(0, 5),
  });
}
