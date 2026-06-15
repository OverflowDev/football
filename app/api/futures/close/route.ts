import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { closePosition } from "@/lib/futures";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ positionId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
  }
  const user = await getCurrentUser();
  const result = await closePosition(user, parsed.data.positionId);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
