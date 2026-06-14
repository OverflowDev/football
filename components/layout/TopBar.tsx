"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Bell, Search, Menu } from "lucide-react";
import { useStore } from "@/store";
import { PlayerAvatar } from "@/components/shared/PlayerAvatar";
import { DEMO_USER } from "@/lib/mock-data";

export function TopBar() {
  const setSearchOpen = useStore((s) => s.setSearchOpen);
  const setMobileNavOpen = useStore((s) => s.setMobileNavOpen);
  const setNotificationPanelOpen = useStore((s) => s.setNotificationPanelOpen);
  const unreadCount = useStore((s) => s.unreadCount);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/5 bg-background/80 px-4 backdrop-blur-xl lg:px-6">
      <button
        onClick={() => setMobileNavOpen(true)}
        className="rounded-lg p-2 text-content-secondary hover:bg-white/5 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <button
        onClick={() => setSearchOpen(true)}
        className="flex h-9 max-w-md flex-1 items-center gap-2 rounded-lg border border-white/10 bg-surface px-3 text-sm text-content-secondary transition-colors hover:border-white/20"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search players…</span>
        <kbd className="ml-auto hidden rounded border border-white/10 px-1.5 py-0.5 text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden sm:block">
          <ConnectButton
            accountStatus="address"
            chainStatus="icon"
            showBalance={false}
          />
        </div>

        <button
          onClick={() => setNotificationPanelOpen(true)}
          className="relative rounded-lg p-2 text-content-secondary hover:bg-white/5 hover:text-content"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-down px-1 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>

        <PlayerAvatar src={DEMO_USER.image} name={DEMO_USER.name} size="sm" />
      </div>
    </header>
  );
}
