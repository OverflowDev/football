import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { fetchTransactions } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const transactions = await fetchTransactions(user.id);
  return NextResponse.json({ transactions });
}
