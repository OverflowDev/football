import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { hasDatabase } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { demoState } from "@/lib/demo-store";
import { getAllPlayers } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

async function getWatchedIds(userId: string): Promise<Set<string>> {
  if (hasDatabase && userId !== "demo-user") {
    const rows = await prisma.watchList.findMany({ where: { userId } });
    return new Set(rows.map((r) => r.playerId));
  }
  return demoState().watchlist;
}

export async function GET() {
  const user = await getCurrentUser();
  const ids = await getWatchedIds(user.id);
  const players = getAllPlayers().filter((p) => ids.has(p.id));
  return NextResponse.json({ players });
}

const mutateSchema = z.object({
  playerId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const parsed = mutateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { playerId } = parsed.data;

  if (hasDatabase && user.id !== "demo-user") {
    await prisma.watchList.upsert({
      where: { userId_playerId: { userId: user.id, playerId } },
      create: { userId: user.id, playerId },
      update: {},
    });
  } else {
    demoState().watchlist.add(playerId);
  }
  return NextResponse.json({ ok: true, watching: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  const parsed = mutateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { playerId } = parsed.data;

  if (hasDatabase && user.id !== "demo-user") {
    await prisma.watchList
      .delete({ where: { userId_playerId: { userId: user.id, playerId } } })
      .catch(() => null);
  } else {
    demoState().watchlist.delete(playerId);
  }
  return NextResponse.json({ ok: true, watching: false });
}
