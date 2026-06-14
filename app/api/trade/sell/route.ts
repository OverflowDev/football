import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { executeTrade } from "@/lib/trade";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  playerId: z.string().min(1),
  shares: z.number().int().positive().max(1_000_000),
  mode: z.enum(["VIRTUAL", "ONCHAIN"]).default("VIRTUAL"),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const user = await getCurrentUser();
  const result = await executeTrade({
    user,
    playerId: parsed.data.playerId,
    shares: parsed.data.shares,
    side: "SELL",
    isOnChain: parsed.data.mode === "ONCHAIN",
  });

  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
