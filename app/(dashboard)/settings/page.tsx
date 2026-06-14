"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { User, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useStore } from "@/store";
import { cn, shortenAddress } from "@/lib/utils";

const TABS = [
  { key: "profile", label: "Profile", icon: User },
  { key: "wallet", label: "Wallet", icon: Wallet },
] as const;

export default function SettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("profile");
  const addToast = useStore((s) => s.addToast);
  const { address, isConnected } = useAccount();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Settings</h1>

      <div className="flex gap-1 border-b border-white/5">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                tab === t.key ? "text-content" : "text-content-secondary hover:text-content"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {tab === t.key && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>

      {tab === "profile" && (
        <Card className="max-w-lg space-y-4 p-5">
          <Input label="Display name" placeholder="Your trader name" />
          <Input
            label="Wallet"
            defaultValue={isConnected && address ? shortenAddress(address) : "Not connected"}
            readOnly
          />
          <Button onClick={() => addToast({ variant: "success", title: "Profile saved" })}>
            Save changes
          </Button>
        </Card>
      )}

      {tab === "wallet" && (
        <Card className="max-w-lg space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold">Connect wallet</h3>
              <p className="mt-1 text-sm text-content-secondary">
                Connect a wallet on Arc to enable on-chain trading and save your portfolio.
              </p>
            </div>
            {isConnected && <Badge variant="up">Connected</Badge>}
          </div>
          <ConnectButton />
          <p className="text-xs text-content-secondary">
            On-chain trades settle in USDC via the FootballMarket contract on Arc, where
            USDC is also the native gas token.
          </p>
        </Card>
      )}
    </div>
  );
}
