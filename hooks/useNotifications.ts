"use client";

import { useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { useStore } from "@/store";
import type { NotificationItem } from "@/types";

export function useNotifications() {
  const setNotifications = useStore((s) => s.setNotifications);
  const query = useApi<{ notifications: NotificationItem[] }>(
    ["notifications"],
    "/api/notifications",
    30000
  );

  useEffect(() => {
    if (query.data?.notifications) {
      setNotifications(query.data.notifications);
    }
  }, [query.data, setNotifications]);

  return query;
}
