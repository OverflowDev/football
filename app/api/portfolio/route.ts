import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { fetchPortfolio } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const portfolio = await fetchPortfolio(user.id);
  return NextResponse.json({ portfolio });
}
