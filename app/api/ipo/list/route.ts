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
  price: z.number().positive().max(1_000_000),
});

/**
 * Mark an IPO token as listed on the spot market (after the on-chain
 * listExternalToken). Upserts the IpoSale row so seed AND admin-created sales
 * are surfaced as tradable players. Admin-gated.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!isAdminWallet(user.walletAddress)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (!hasDatabase) {
    return NextResponse.json({ ok: false, error: "Database required to surface listings" }, { status: 503 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const d = parsed.data;
  const base = { saleId: d.saleId, playerToken: d.playerToken, name: d.name, club: d.club, position: d.position, nat: d.nat };
  await prisma.ipoSale.upsert({
    where: { saleId: d.saleId },
    create: { ...base, listed: true, listedPrice: d.price },
    update: { ...base, listed: true, listedPrice: d.price },
  });
  return NextResponse.json({ ok: true });
}
