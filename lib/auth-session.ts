// Stateless signed session tokens (HMAC-SHA256). Used for the httpOnly
// `fpi_session` cookie. No external dependency — Node crypto only.

import crypto from "crypto";
import { env, isProd } from "@/lib/env";

export const SESSION_COOKIE = "fpi_session";
export const NONCE_COOKIE = "fpi_nonce";
const DEFAULT_TTL = 7 * 24 * 60 * 60; // 7 days

function secret(): string {
  if (env.SESSION_SECRET) return env.SESSION_SECRET;
  if (isProd) throw new Error("SESSION_SECRET is required in production");
  return "dev-insecure-session-secret-change-me";
}

export interface SessionPayload {
  uid: string;
  address: string;
  exp: number;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/** Create a signed session token for a verified wallet user. */
export function signSession(
  data: { uid: string; address: string },
  ttlSeconds = DEFAULT_TTL
): string {
  const payload: SessionPayload = {
    uid: data.uid,
    address: data.address.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/** Verify a session token; returns the payload or null if invalid/expired. */
export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
  maxAge: DEFAULT_TTL,
};
