import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildSiweMessage } from "@/lib/siwe";
import { NONCE_COOKIE } from "@/lib/auth-session";
import { isProd } from "@/lib/env";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.coerce.number().int().positive().default(5042002),
});

/** Issue a nonce + the exact SIWE message the wallet should sign. */
export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries())
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid address required" }, { status: 400 });
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const now = new Date();
  const exp = new Date(now.getTime() + 10 * 60 * 1000); // 10-minute window
  const host = req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (isProd ? "https" : "http");

  const message = buildSiweMessage({
    domain: host,
    address: parsed.data.address,
    uri: `${proto}://${host}`,
    chainId: parsed.data.chainId,
    nonce,
    issuedAt: now.toISOString(),
    expirationTime: exp.toISOString(),
  });

  const res = NextResponse.json({ message });
  res.cookies.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
