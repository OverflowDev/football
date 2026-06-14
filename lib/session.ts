import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hasDatabase } from "@/lib/config";
import { DEMO_USER } from "@/lib/mock-data";
import { shortenAddress } from "@/lib/utils";
import type { ApiUser } from "@/types";

export const WALLET_COOKIE = "fpi_wallet";

/**
 * Resolve the current user for API routes / server components.
 *
 * Identity is the connected wallet address, stored in the `fpi_wallet` cookie
 * by the client (see components/providers/WalletSync). With a database, the
 * user is upserted by wallet address; otherwise (or with no wallet connected)
 * a stable demo user is returned so the app is fully usable.
 */
export async function getCurrentUser(): Promise<ApiUser> {
  const wallet = cookies().get(WALLET_COOKIE)?.value?.toLowerCase() || null;

  if (!hasDatabase || !wallet) {
    return { ...DEMO_USER, walletAddress: wallet };
  }

  const user = await prisma.user.upsert({
    where: { walletAddress: wallet },
    update: {},
    create: { walletAddress: wallet, virtualBalance: 10000 },
  });

  return {
    id: user.id,
    name: user.name ?? shortenAddress(wallet),
    email: user.email ?? "",
    image: user.image ?? `https://ui-avatars.com/api/?name=${wallet.slice(2, 4)}&background=6366f1&color=fff`,
    walletAddress: user.walletAddress,
    virtualBalance: Number(user.virtualBalance),
    isPremium: false,
  };
}
