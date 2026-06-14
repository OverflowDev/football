"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Activity, Wallet } from "lucide-react";
import { NAV_ITEMS } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/5 bg-surface/60 backdrop-blur-xl lg:flex">
      <div className="flex h-16 items-center gap-2 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-sm font-bold tracking-tight">FPI</p>
          <p className="text-[10px] text-content-secondary">Performance Index</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "text-content"
                  : "text-content-secondary hover:text-content hover:bg-white/5"
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-primary/15 ring-1 ring-primary/30"
                  transition={{ type: "spring", duration: 0.4 }}
                />
              )}
              <Icon className="relative h-[18px] w-[18px]" />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="flex items-center gap-1.5 font-display text-sm font-semibold text-primary">
          <Wallet className="h-4 w-4" /> Wallet
        </p>
        <p className="mt-1 text-xs text-content-secondary">
          Connect a wallet to trade on-chain on Arc and save your portfolio.
        </p>
        <div className="mt-3">
          <ConnectButton showBalance={false} accountStatus="address" chainStatus="none" />
        </div>
      </div>
    </aside>
  );
}
