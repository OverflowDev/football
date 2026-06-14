import { NextRequest } from "next/server";

/**
 * Verify a cron request is authorized. Vercel Cron sends the CRON_SECRET as a
 * Bearer token. When CRON_SECRET is unset (local/demo) all requests pass.
 */
export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}
