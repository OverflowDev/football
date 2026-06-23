import { NextResponse } from "next/server";
import { getIpos } from "@/lib/ipo";
import { getOnChainIpos } from "@/lib/onchain-ipo";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Upcoming + Recently-Listed (off-chain metadata) + LIVE presales (on-chain). */
export async function GET() {
  const user = await getCurrentUser();
  const [meta, live] = await Promise.all([
    Promise.resolve(getIpos()),
    getOnChainIpos(user.walletAddress),
  ]);
  return NextResponse.json({ ipos: [...meta, ...live] });
}
