"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Wallet, Zap } from "lucide-react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useTrade } from "@/hooks/useTrade";
import { useOpenFuture } from "@/hooks/useFutures";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useStore } from "@/store";
import { liquidationPrice } from "@/lib/futures-math";
import { TRADING_FEE_RATE, cn, formatCurrency } from "@/lib/utils";
import type { FuturesSide, Player, TradeKind, TradeMode } from "@/types";

const LEVERAGES = [1, 2, 5, 10];

export function TradePanel({ player }: { player: Player }) {
  const [kind, setKind] = useState<TradeKind>("SPOT");

  return (
    <div className="card-surface bg-card p-4">
      {/* Spot / Futures */}
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg border border-white/10 p-1">
        {(["SPOT", "FUTURES"] as TradeKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors",
              kind === k ? "bg-white/10 text-content" : "text-content-secondary"
            )}
          >
            {k === "FUTURES" && <Zap className="h-3.5 w-3.5" />}
            {k === "SPOT" ? "Spot" : "Futures"}
          </button>
        ))}
      </div>

      {kind === "SPOT" ? <SpotForm player={player} /> : <FuturesForm player={player} />}
    </div>
  );
}

// ─────────────────────────────── Spot ────────────────────────────────
function SpotForm({ player }: { player: Player }) {
  const [mode, setMode] = useState<TradeMode>("VIRTUAL");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [sharesStr, setSharesStr] = useState("10");

  const live = useStore((s) => s.livePrices[player.id]);
  const price = live?.price ?? player.currentPrice;
  const { data: portfolioData } = usePortfolio();
  const trade = useTrade();
  const { isConnected } = useAccount();

  const shares = Math.max(0, Math.floor(Number(sharesStr) || 0));
  const subtotal = useMemo(() => Math.round(shares * price * 100) / 100, [shares, price]);
  const fee = Math.round(subtotal * TRADING_FEE_RATE * 100) / 100;
  const totalCost = side === "BUY" ? subtotal + fee : subtotal - fee;

  const cashBalance = portfolioData?.portfolio.cashBalance ?? 0;
  const holding = portfolioData?.portfolio.holdings.find((h) => h.player.id === player.id);
  const ownedShares = holding?.shares ?? 0;

  const priceImpact = useMemo(() => {
    const float = player.sharesAvailable || 1;
    return Math.min(100, (shares / float) * 100 * 50);
  }, [shares, player.sharesAvailable]);

  const balanceAfter = side === "BUY" ? cashBalance - totalCost : cashBalance + totalCost;
  const canAfford = side === "BUY" ? totalCost <= cashBalance : shares <= ownedShares;
  const validShares = shares > 0;
  const onChainBlocked = mode === "ONCHAIN" && !isConnected;

  const submit = () => {
    if (!validShares || !canAfford || onChainBlocked) return;
    trade.mutate({ playerId: player.id, shares, mode, side });
  };

  return (
    <>
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg border border-white/10 p-1">
        {(["VIRTUAL", "ONCHAIN"] as TradeMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "rounded-md py-1.5 text-xs font-medium transition-colors",
              mode === m ? "bg-white/10 text-content" : "text-content-secondary"
            )}
          >
            {m === "VIRTUAL" ? "Virtual" : "On-Chain"}
          </button>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-white/10 p-1">
        <button
          onClick={() => setSide("BUY")}
          className={cn("rounded-md py-2 text-sm font-semibold transition-colors", side === "BUY" ? "bg-up text-white" : "text-content-secondary")}
        >
          Buy
        </button>
        <button
          onClick={() => setSide("SELL")}
          className={cn("rounded-md py-2 text-sm font-semibold transition-colors", side === "SELL" ? "bg-down text-white" : "text-content-secondary")}
        >
          Sell
        </button>
      </div>

      <Input label="Shares" type="number" min={0} value={sharesStr} onChange={(e) => setSharesStr(e.target.value)} rightElement={player.symbol} />

      <div className="mt-2 flex gap-1.5">
        {[10, 50, 100, 500].map((q) => (
          <button key={q} onClick={() => setSharesStr(String(q))} className="flex-1 rounded-md border border-white/10 py-1 text-xs text-content-secondary hover:bg-white/5">
            {q}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2 rounded-lg bg-surface/60 p-3 text-sm">
        <Row label="Price / share" value={formatCurrency(price)} />
        <Row label="Subtotal" value={formatCurrency(subtotal)} />
        <Row label={`Fee (${(TRADING_FEE_RATE * 100).toFixed(1)}%)`} value={formatCurrency(fee)} />
        <div className="my-1 border-t border-white/5" />
        <Row label={side === "BUY" ? "Total cost" : "You receive"} value={formatCurrency(totalCost)} bold />
        <Row label="Balance after" value={formatCurrency(Math.max(0, balanceAfter))} muted />
        {side === "SELL" && <Row label="Shares owned" value={ownedShares.toLocaleString()} muted />}
      </div>

      {priceImpact > 2 && validShares && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-gold/20 bg-gold/5 p-2.5 text-xs text-gold">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>High price impact (~{priceImpact.toFixed(1)}%). Large orders move the bonding curve.</span>
        </div>
      )}

      {onChainBlocked && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs text-primary">
          <Wallet className="h-4 w-4" /> Connect a wallet to trade on-chain.
        </div>
      )}

      <Button
        fullWidth
        size="lg"
        variant={side === "BUY" ? "success" : "danger"}
        className="mt-4"
        loading={trade.isPending}
        disabled={!validShares || !canAfford || onChainBlocked}
        onClick={submit}
      >
        {!canAfford && validShares
          ? side === "BUY"
            ? "Insufficient balance"
            : "Not enough shares"
          : `${side === "BUY" ? "Buy" : "Sell"} ${shares || ""} ${player.symbol}`}
      </Button>
    </>
  );
}

// ───────────────────────────── Futures ───────────────────────────────
function FuturesForm({ player }: { player: Player }) {
  const [side, setSide] = useState<FuturesSide>("LONG");
  const [sizeStr, setSizeStr] = useState("10");
  const [leverage, setLeverage] = useState(2);

  const live = useStore((s) => s.livePrices[player.id]);
  const entry = live?.price ?? player.currentPrice;
  const { data: portfolioData } = usePortfolio();
  const open = useOpenFuture();

  const size = Math.max(0, Math.floor(Number(sizeStr) || 0));
  const notional = Math.round(size * entry * 100) / 100;
  const margin = Math.round((notional / leverage) * 100) / 100;
  const fee = Math.round(notional * TRADING_FEE_RATE * 100) / 100;
  const liq = liquidationPrice(entry, side, leverage);
  const cost = margin + fee;

  const cashBalance = portfolioData?.portfolio.cashBalance ?? 0;
  const canAfford = cost <= cashBalance;
  const valid = size > 0;

  const submit = () => {
    if (!valid || !canAfford) return;
    open.mutate({ playerId: player.id, side, size, leverage });
  };

  return (
    <>
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg border border-white/10 p-1">
        <button
          onClick={() => setSide("LONG")}
          className={cn("rounded-md py-2 text-sm font-semibold transition-colors", side === "LONG" ? "bg-up text-white" : "text-content-secondary")}
        >
          Long
        </button>
        <button
          onClick={() => setSide("SHORT")}
          className={cn("rounded-md py-2 text-sm font-semibold transition-colors", side === "SHORT" ? "bg-down text-white" : "text-content-secondary")}
        >
          Short
        </button>
      </div>

      <Input label="Size" type="number" min={0} value={sizeStr} onChange={(e) => setSizeStr(e.target.value)} rightElement={player.symbol} />
      <div className="mt-2 flex gap-1.5">
        {[10, 50, 100, 500].map((q) => (
          <button key={q} onClick={() => setSizeStr(String(q))} className="flex-1 rounded-md border border-white/10 py-1 text-xs text-content-secondary hover:bg-white/5">
            {q}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-xs font-medium text-content-secondary">Leverage</p>
        <div className="grid grid-cols-4 gap-1.5">
          {LEVERAGES.map((l) => (
            <button
              key={l}
              onClick={() => setLeverage(l)}
              className={cn(
                "rounded-md border py-1.5 text-xs font-semibold transition-colors",
                leverage === l ? "border-primary/50 bg-primary/15 text-primary" : "border-white/10 text-content-secondary hover:bg-white/5"
              )}
            >
              {l}x
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2 rounded-lg bg-surface/60 p-3 text-sm">
        <Row label="Entry price" value={formatCurrency(entry)} />
        <Row label="Notional" value={formatCurrency(notional)} />
        <Row label={`Fee (${(TRADING_FEE_RATE * 100).toFixed(1)}%)`} value={formatCurrency(fee)} />
        <div className="my-1 border-t border-white/5" />
        <Row label="Margin required" value={formatCurrency(cost)} bold />
        <div className="flex items-center justify-between">
          <span className="text-content-secondary">Liquidation price</span>
          <span className="font-mono tabular-nums text-down">{formatCurrency(liq)}</span>
        </div>
        <Row label="Balance after" value={formatCurrency(Math.max(0, cashBalance - cost))} muted />
      </div>

      {leverage >= 5 && valid && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-gold/20 bg-gold/5 p-2.5 text-xs text-gold">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>High leverage — a {(100 / leverage).toFixed(0)}% move against you triggers liquidation.</span>
        </div>
      )}

      <Button
        fullWidth
        size="lg"
        variant={side === "LONG" ? "success" : "danger"}
        className="mt-4"
        loading={open.isPending}
        disabled={!valid || !canAfford}
        onClick={submit}
      >
        {!canAfford && valid ? "Insufficient margin" : (
          <>
            {side === "LONG" ? "Long" : "Short"} {leverage}x · {player.symbol}
            <Badge variant={side === "LONG" ? "up" : "down"} className="ml-1">{size || 0}</Badge>
          </>
        )}
      </Button>
    </>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-content-secondary">{label}</span>
      <span className={cn("font-mono tabular-nums", bold && "font-semibold text-content", muted && "text-content-secondary")}>{value}</span>
    </div>
  );
}
