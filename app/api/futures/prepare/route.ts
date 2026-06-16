import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { marketData } from "@/lib/market-data";
import { TRADING_FEE_RATE } from "@/lib/utils";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  playerId: z.string().min(1),
  side: z.enum(["LONG", "SHORT"]),
  size: z.number().int().positive().max(1_000_000),
  leverage: z.number().int().min(1).max(10),
});

/**
 * Build the unsigned parameters for opening an on-chain futures position.
 * The client approves USDC margin + fee, then calls openPosition; positions
 * are read back live from the chain (see /api/futures).
 */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user || !user.walletAddress) {
    return NextResponse.json({ error: "Sign in with your wallet first" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const player = await marketData.getPlayerById(parsed.data.playerId);
  if (!player?.contractAddress) {
    return NextResponse.json({ error: "This player is not tokenized on-chain yet" }, { status: 400 });
  }

  const futures = process.env.NEXT_PUBLIC_FOOTBALL_FUTURES_ADDRESS;
  const usdc = process.env.NEXT_PUBLIC_USDC_ADDRESS;
  if (!futures) return NextResponse.json({ error: "Futures contract not configured" }, { status: 503 });

  const { side, size, leverage } = parsed.data;
  const notional = size * player.currentPrice;
  const margin = notional / leverage;
  const fee = notional * TRADING_FEE_RATE;
  // USDC 6dp, with ~1% headroom for price drift between prepare and execution
  const approveAmount = Math.ceil((margin + fee) * 1.01 * 1e6).toString();

  return NextResponse.json({
    futuresAddress: futures,
    usdcAddress: usdc,
    playerToken: player.contractAddress,
    isLong: side === "LONG",
    size: (BigInt(size) * 10n ** 18n).toString(),
    leverage,
    approveAmount,
  });
}
