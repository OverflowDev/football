import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getOnChainHoldings } from "@/lib/onchain-portfolio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user.walletAddress) {
    return NextResponse.json({ holdings: [] });
  }
  const holdings = await getOnChainHoldings(user.walletAddress);
  return NextResponse.json({ holdings });
}
