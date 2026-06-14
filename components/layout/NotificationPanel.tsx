"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, X, TrendingUp, Newspaper, Sparkles, Coins, ArrowLeftRight } from "lucide-react";
import { useStore } from "@/store";
import { useNotifications } from "@/hooks/useNotifications";
import { timeAgo } from "@/lib/utils";
import type { NotificationItem } from "@/types";

const ICONS: Record<NotificationItem["type"], React.ReactNode> = {
  PRICE_ALERT: <TrendingUp className="h-4 w-4 text-primary" />,
  TRANSFER_NEWS: <Newspaper className="h-4 w-4 text-gold" />,
  AI_INSIGHT: <Sparkles className="h-4 w-4 text-primary" />,
  DIVIDEND: <Coins className="h-4 w-4 text-up" />,
  TRADE_EXECUTED: <ArrowLeftRight className="h-4 w-4 text-content" />,
};

export function NotificationPanel() {
  const open = useStore((s) => s.notificationPanelOpen);
  const setOpen = useStore((s) => s.setNotificationPanelOpen);
  const notifications = useStore((s) => s.notifications);
  const markAllRead = useStore((s) => s.markAllRead);
  useNotifications();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <motion.div
            initial={{ x: 360 }}
            animate={{ x: 0 }}
            exit={{ x: 360 }}
            transition={{ type: "spring", duration: 0.35 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-white/5 bg-surface"
          >
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <h2 className="font-display font-semibold">Notifications</h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-content-secondary hover:bg-white/5"
                >
                  <Check className="h-3.5 w-3.5" /> Mark all read
                </button>
                <button onClick={() => setOpen(false)} aria-label="Close">
                  <X className="h-5 w-5 text-content-secondary" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-content-secondary">
                  You're all caught up.
                </p>
              )}
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-3 border-b border-white/5 px-5 py-4 ${
                    n.isRead ? "opacity-60" : ""
                  }`}
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                    {ICONS[n.type]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-content">{n.title}</p>
                    <p className="mt-0.5 text-xs text-content-secondary">{n.message}</p>
                    <p className="mt-1 text-[10px] text-content-secondary/70">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
