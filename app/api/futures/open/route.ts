import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { openPosition, MAX_LEVERAGE } from "@/lib/futures";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  playerId: z.string().min(1),
  side: z.enum(["LONG", "SHORT"]),
  size: z.number().int().positive().max(1_000_000),
  leverage: z.number().int().min(1).max(MAX_LEVERAGE),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const user = await getCurrentUser();
  const result = await openPosition({ user, ...parsed.data });
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
