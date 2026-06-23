import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hasDatabase } from "@/lib/config";
import { getCurrentUser } from "@/lib/session";
import { isAdminWallet } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  saleId: z.number().int().positive(),
  playerToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  name: z.string().min(1).max(80),
  club: z.string().max(80).default(""),
  position: z.enum(["FWD", "MID", "DEF", "GK"]).default("FWD"),
  nat: z.string().max(3).default(""),
});

/** Persist listing metadata for an admin-created on-chain presale. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!isAdminWallet(user.walletAddress)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (!hasDatabase) {
    return NextResponse.json({ ok: false, error: "Database required to persist listings" }, { status: 503 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const d = parsed.data;
  const data = { saleId: d.saleId, playerToken: d.playerToken, name: d.name, club: d.club, position: d.position, nat: d.nat };
  await prisma.ipoSale.upsert({ where: { saleId: d.saleId }, create: data, update: data });
  return NextResponse.json({ ok: true });
}
