"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PlayerAvatar } from "@/components/shared/PlayerAvatar";
import { PriceTag } from "@/components/shared/PriceTag";
import { useStore } from "@/store";
import { formatCurrency } from "@/lib/utils";

/** Command palette (cmd/ctrl + K) player search. */
export function SearchModal() {
  const router = useRouter();
  const open = useStore((s) => s.searchOpen);
  const setOpen = useStore((s) => s.setSearchOpen);
  const players = useStore((s) => s.players);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? players.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.symbol.toLowerCase().includes(q) ||
            p.club.name.toLowerCase().includes(q)
        )
      : players;
    return list.slice(0, 8);
  }, [query, players]);

  const go = (slug: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/market/${slug}`);
  };

  return (
    <Modal open={open} onClose={() => setOpen(false)} sheetOnMobile={false} className="max-w-lg">
      <div className="-m-5">
        <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
          <Search className="h-5 w-5 text-content-secondary" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
              if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
              if (e.key === "Enter" && results[active]) go(results[active].slug);
            }}
            placeholder="Search players, clubs, tickers…"
            className="flex-1 bg-transparent text-sm text-content placeholder:text-content-secondary/60 focus:outline-none"
          />
          <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-content-secondary">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-content-secondary">
              No players found.
            </p>
          )}
          {results.map((p, i) => (
            <button
              key={p.id}
              onClick={() => go(p.slug)}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                i === active ? "bg-white/5" : ""
              }`}
            >
              <PlayerAvatar src={p.imageUrl} name={p.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-content">{p.name}</p>
                <p className="truncate text-xs text-content-secondary">
                  {p.symbol} · {p.club.shortName}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm text-content">{formatCurrency(p.currentPrice)}</p>
                <PriceTag value={p.priceChangePercent24h} showArrow={false} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
