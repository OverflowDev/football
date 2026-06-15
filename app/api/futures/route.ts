import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { listPositions } from "@/lib/futures";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const positions = await listPositions(user);
  return NextResponse.json({ positions });
}
