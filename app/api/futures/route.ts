import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getOnChainPositions } from "@/lib/onchain-futures";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Open futures positions, read live from the FootballFutures contract. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user.walletAddress) return NextResponse.json({ positions: [] });
  const positions = await getOnChainPositions(user.walletAddress);
  return NextResponse.json({ positions });
}
