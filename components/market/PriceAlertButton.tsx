"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";
import type { Player } from "@/types";

export function PriceAlertButton({ player, fullWidth }: { player: Player; fullWidth?: boolean }) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"ABOVE" | "BELOW">("ABOVE");
  const [target, setTarget] = useState(player.currentPrice.toFixed(2));
  const [loading, setLoading] = useState(false);
  const addToast = useStore((s) => s.addToast);

  const submit = async () => {
    setLoading(true);
    try {
      await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: player.id, targetPrice: Number(target), direction }),
      });
      addToast({
        variant: "success",
        title: "Price alert set",
        description: `${player.symbol} ${direction.toLowerCase()} £${Number(target).toFixed(2)}`,
      });
      setOpen(false);
    } catch {
      addToast({ variant: "error", title: "Could not set alert" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="secondary" fullWidth={fullWidth} onClick={() => setOpen(true)}>
        <Bell className="h-4 w-4" /> Set Alert
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Price alert · ${player.symbol}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 p-1">
            {(["ABOVE", "BELOW"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                className={cn(
                  "rounded-md py-2 text-sm font-medium capitalize transition-colors",
                  direction === d ? "bg-primary/20 text-primary" : "text-content-secondary"
                )}
              >
                {d.toLowerCase()}
              </button>
            ))}
          </div>
          <Input
            label="Target price"
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            leftIcon={<span className="text-sm">£</span>}
          />
          <p className="text-xs text-content-secondary">
            We'll notify you when {player.symbol} goes {direction.toLowerCase()} £
            {Number(target).toFixed(2)}.
          </p>
          <Button fullWidth onClick={submit} loading={loading}>
            Create alert
          </Button>
        </div>
      </Modal>
    </>
  );
}
