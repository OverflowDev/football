import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getIpos, commitToIpo, ipoOnChain } from "@/lib/ipo";
import { getOnChainIpos } from "@/lib/onchain-ipo";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  const offchain = getIpos(user.walletAddress);

  if (ipoOnChain) {
    // replace the demo LIVE pool with real on-chain sales
    const onchainLive = await getOnChainIpos(user.walletAddress);
    const ipos = offchain.filter((i) => i.status !== "LIVE").concat(onchainLive);
    return NextResponse.json({ ipos, onChain: true });
  }
  return NextResponse.json({ ipos: offchain, onChain: false });
}

const commitSchema = z.object({
  ipoId: z.string().min(1),
  shares: z.number().int().positive().max(10_000_000),
  price: z.number().positive().max(100000),
});

/** Off-chain (demo) presale commitment. On-chain sales deposit via the contract. */
export async function POST(req: NextRequest) {
  if (ipoOnChain) {
    return NextResponse.json({ ok: false, error: "On-chain presale — deposit via your wallet" }, { status: 400 });
  }
  const parsed = commitSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const user = await getCurrentUser();
  const result = commitToIpo(parsed.data.ipoId, parsed.data.shares, parsed.data.price, user.walletAddress);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
