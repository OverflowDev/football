import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyMessage } from "viem";
import { parseSiweMessage } from "@/lib/siwe";
import { NONCE_COOKIE, SESSION_COOKIE, signSession, sessionCookieOptions } from "@/lib/auth-session";
import { hasDatabase } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  message: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

/**
 * Verify a signed SIWE message and issue a server-signed session cookie.
 * Truth is the cryptographic signature + server-issued nonce — never the
 * client's claimed identity.
 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const fields = parseSiweMessage(parsed.data.message);
  if (!fields) {
    return NextResponse.json({ error: "Malformed message" }, { status: 400 });
  }

  // nonce must match the one we issued (httpOnly cookie)
  const cookieNonce = req.cookies.get(NONCE_COOKIE)?.value;
  if (!cookieNonce || cookieNonce !== fields.nonce) {
    return NextResponse.json({ error: "Invalid or expired nonce" }, { status: 401 });
  }
  if (new Date(fields.expirationTime).getTime() < Date.now()) {
    return NextResponse.json({ error: "Sign-in request expired" }, { status: 401 });
  }

  // cryptographic verification
  let valid = false;
  try {
    valid = await verifyMessage({
      address: fields.address as `0x${string}`,
      message: parsed.data.message,
      signature: parsed.data.signature as `0x${string}`,
    });
  } catch {
    valid = false;
  }
  if (!valid) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
  }

  const address = fields.address.toLowerCase();

  // create / load the user
  let uid = "demo-user";
  if (hasDatabase) {
    const user = await prisma.user.upsert({
      where: { walletAddress: address },
      update: {},
      create: { walletAddress: address, virtualBalance: 10000 },
    });
    uid = user.id;
  }

  const token = signSession({ uid, address });
  const res = NextResponse.json({ ok: true, address });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  res.cookies.set(NONCE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
