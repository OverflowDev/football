import { NextRequest, NextResponse } from "next/server";
import { getFixtures } from "@/lib/openfootball";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const league = req.nextUrl.searchParams.get("league") || "en.1";
  const data = await getFixtures(league);
  return NextResponse.json(data);
}
