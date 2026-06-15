import { NextResponse } from "next/server";
import { getCurrentUser, isAuthenticated } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const [user, authed] = await Promise.all([getCurrentUser(), isAuthenticated()]);
  return NextResponse.json({ authenticated: authed, user });
}
