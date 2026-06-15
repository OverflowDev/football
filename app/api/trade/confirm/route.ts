import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { marketData } from "@/lib/market-data";
import { confirmTradeReceipt } from "@/lib/onchain";
import { hasDatabase } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { TRADING_FEE_RATE } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  playerId: z.string().min(1),
  side: z.enum(["BUY", "SELL"]),
});

/**
 * Confirm an on-chain trade by verifying the receipt + emitted event server-side.
 * Truth comes from the chain, not the client. On success we persist a mirrored
 * Transaction + Portfolio update for display.
 */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user || !user.walletAddress) {
    return NextResponse.json({ success: false, error: "Sign in with your wallet first" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
  }

  const player = await marketData.getPlayerById(parsed.data.playerId);
  if (!player?.contractAddress) {
    return NextResponse.json({ success: false, error: "Player not tokenized" }, { status: 400 });
  }

  const result = await confirmTradeReceipt({
    hash: parsed.data.hash as `0x${string}`,
    expectedUser: user.walletAddress,
    expectedToken: player.contractAddress,
    side: parsed.data.side,
  });

  if (!result.ok || result.shares === undefined || result.price === undefined) {
    return NextResponse.json({ success: false, error: result.reason || "Verification failed" }, { status: 400 });
  }

  const shares = result.shares;
  const price = result.price;
  const total = Math.round(shares * price * 100) / 100;
  const fee = Math.round(total * TRADING_FEE_RATE * 100) / 100;

  // Record the trade for history only. On-chain HOLDINGS are NOT mirrored into
  // the virtual Portfolio table — they live in the user's wallet and are read
  // live from the chain (see lib/onchain-portfolio). This avoids virtual/chain
  // state drift.
  if (hasDatabase && user.id !== "demo-user") {
    // Replay protection: a given txHash can only be recorded once. If we've
    // already seen it, return idempotently instead of duplicating history.
    const existing = await prisma.transaction.findUnique({
      where: { txHash: result.txHash },
    });
    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyRecorded: true,
        txHash: result.txHash,
        shares,
        pricePerShare: price,
        total,
        fee,
      });
    }
    await prisma.transaction
      .create({
        data: {
          userId: user.id,
          playerId: player.id,
          type: parsed.data.side,
          shares,
          pricePerShare: price,
          totalAmount: total,
          fee,
          isOnChain: true,
          txHash: result.txHash,
        },
      })
      .catch(() => null); // unique constraint = concurrent duplicate; safe to ignore
  }

  return NextResponse.json({
    success: true,
    txHash: result.txHash,
    shares,
    pricePerShare: price,
    total,
    fee,
  });
}
