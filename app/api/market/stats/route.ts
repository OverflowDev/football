import { NextResponse } from "next/server";
import { fetchMarketStats } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await fetchMarketStats();
  return NextResponse.json({ stats });
}
