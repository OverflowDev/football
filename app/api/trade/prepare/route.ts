import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { marketData } from "@/lib/market-data";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  playerId: z.string().min(1),
  side: z.enum(["BUY", "SELL"]),
  shares: z.number().int().positive().max(1_000_000),
});

/**
 * Build the unsigned transaction parameters for an on-chain trade. The client
 * signs/sends it with the user's wallet; the server later verifies the receipt
 * in /api/trade/confirm.
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
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  if (!player.contractAddress) {
    return NextResponse.json({ error: "This player is not tokenized on-chain yet" }, { status: 400 });
  }

  const market = process.env.NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS;
  const usdc = process.env.NEXT_PUBLIC_USDC_ADDRESS;
  if (!market) return NextResponse.json({ error: "Market not configured" }, { status: 503 });

  const amountWei = (BigInt(parsed.data.shares) * 10n ** 18n).toString();
  // approximate USDC cost (6-dp) the buyer should approve (incl. ~0.6% headroom)
  const approxCostUsdc = Math.ceil(parsed.data.shares * player.currentPrice * 1.006 * 1e6).toString();

  return NextResponse.json({
    chainId: Number(process.env.ARC_CHAIN_ID || 5042002),
    marketAddress: market,
    usdcAddress: usdc,
    playerToken: player.contractAddress,
    functionName: parsed.data.side === "BUY" ? "buyShares" : "sellShares",
    args: [player.contractAddress, amountWei],
    approveAmount: approxCostUsdc, // for BUY: approve USDC to the market
  });
}
