import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { hasDatabase } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { getAllPlayers } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

/**
 * Runs every 5 min (Vercel Cron). Evaluates untriggered price alerts against
 * current prices and emits notifications when hit.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasDatabase) {
    return NextResponse.json({ ok: true, triggered: 0, note: "No DB — alerts are a no-op in demo mode." });
  }

  const priceById = new Map(getAllPlayers().map((p) => [p.id, p.currentPrice]));
  const alerts = await prisma.priceAlert.findMany({ where: { isTriggered: false } });
  let triggered = 0;

  for (const alert of alerts) {
    const price = priceById.get(alert.playerId);
    if (price === undefined) continue;
    const hit =
      (alert.direction === "ABOVE" && price >= Number(alert.targetPrice)) ||
      (alert.direction === "BELOW" && price <= Number(alert.targetPrice));
    if (!hit) continue;

    triggered++;
    await prisma.priceAlert.update({ where: { id: alert.id }, data: { isTriggered: true } });
    await prisma.notification.create({
      data: {
        userId: alert.userId,
        type: "PRICE_ALERT",
        title: "Price alert triggered",
        message: `Price ${alert.direction.toLowerCase()} £${Number(alert.targetPrice).toFixed(2)} reached (now £${price.toFixed(2)}).`,
        playerId: alert.playerId,
      },
    });
  }

  return NextResponse.json({ ok: true, triggered });
}
