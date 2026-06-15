import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWriteUser } from "@/lib/session";
import { hasDatabase } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  playerId: z.string().min(1),
  targetPrice: z.number().positive(),
  direction: z.enum(["ABOVE", "BELOW"]),
});

export async function POST(req: NextRequest) {
  const user = await requireWriteUser();
  if (!user) return NextResponse.json({ error: "Sign in to set price alerts" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (!hasDatabase || user.id === "demo-user") {
    // demo: acknowledge without persistence
    return NextResponse.json({ ok: true, demo: true });
  }

  const alert = await prisma.priceAlert.create({
    data: {
      userId: user.id,
      playerId: parsed.data.playerId,
      targetPrice: parsed.data.targetPrice,
      direction: parsed.data.direction,
    },
  });
  return NextResponse.json({ ok: true, alert });
}
