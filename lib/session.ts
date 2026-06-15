import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hasDatabase } from "@/lib/config";
import { DEMO_USER } from "@/lib/mock-data";
import { shortenAddress } from "@/lib/utils";
import { SESSION_COOKIE, verifySession } from "@/lib/auth-session";
import type { ApiUser } from "@/types";

/**
 * Resolve the current user from the server-signed `fpi_session` cookie ONLY.
 * We never trust `document.cookie` or a wallet address from the request body —
 * identity comes from a verified SIWE signature (see /api/auth/verify).
 *
 * With no valid session the caller is treated as the read-only demo user, so
 * the app stays browsable, but writes are scoped to a real session.
 */
export async function getCurrentUser(): Promise<ApiUser> {
  const session = verifySession(cookies().get(SESSION_COOKIE)?.value);

  if (!session) {
    return { ...DEMO_USER };
  }

  if (!hasDatabase || session.uid === "demo-user") {
    return { ...DEMO_USER, walletAddress: session.address };
  }

  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user) return { ...DEMO_USER, walletAddress: session.address };

  return {
    id: user.id,
    name: user.name ?? shortenAddress(user.walletAddress),
    email: user.email ?? "",
    image: user.image ?? `https://ui-avatars.com/api/?name=${session.address.slice(2, 4)}&background=6366f1&color=fff`,
    walletAddress: user.walletAddress,
    virtualBalance: Number(user.virtualBalance),
    isPremium: false,
  };
}

/** True when the request carries a valid, non-demo session. */
export async function isAuthenticated(): Promise<boolean> {
  const session = verifySession(cookies().get(SESSION_COOKIE)?.value);
  return !!session && session.uid !== "demo-user";
}

/** For write routes: returns the user only if truly authenticated, else null. */
export async function requireUser(): Promise<ApiUser | null> {
  const session = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return getCurrentUser();
}
