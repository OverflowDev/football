import { NextResponse } from "next/server";
import { getIpos } from "@/lib/ipo";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ipos: getIpos() });
}
