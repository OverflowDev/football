import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { hasDatabase } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { getNotifications } from "@/lib/mock-data";
import type { NotificationItem } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (hasDatabase && user.id !== "demo-user") {
    const rows = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    const notifications: NotificationItem[] = rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      message: r.message,
      isRead: r.isRead,
      playerId: r.playerId,
      createdAt: r.createdAt.toISOString(),
    }));
    return NextResponse.json({ notifications });
  }

  return NextResponse.json({ notifications: getNotifications() });
}
