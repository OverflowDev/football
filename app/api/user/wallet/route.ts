import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { hasDatabase } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address"),
});

/** Link a connected wallet address to the current user. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  if (!hasDatabase || user.id === "demo-user") {
    return NextResponse.json({ ok: true, demo: true, walletAddress: parsed.data.walletAddress });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { walletAddress: parsed.data.walletAddress },
  });
  return NextResponse.json({ ok: true, walletAddress: parsed.data.walletAddress });
}
