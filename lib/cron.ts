import type { NextRequest } from "next/server";

/**
 * Verify a cron request is authorized.
 *
 * - With CRON_SECRET set, the request must carry `Authorization: Bearer <secret>`
 *   (Vercel Cron sends this automatically).
 * - With CRON_SECRET unset, requests are allowed ONLY outside production. In
 *   production a missing secret is treated as unauthorized — never a silent open
 *   endpoint.
 */
export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
