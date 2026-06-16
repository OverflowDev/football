"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Wallet, Zap } from "lucide-react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useOnchainTrade } from "@/hooks/useOnchainTrade";
import { useOpenFuture } from "@/hooks/useFutures";
import { useStore } from "@/store";
import { liquidationPrice } from "@/lib/futures-math";
import { TRADING_FEE_RATE, cn, formatCurrency } from "@/lib/utils";
import type { FuturesSide, Player, TradeKind } from "@/types";

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
// On-chain only: settles in USDC through the FootballMarket contract on Arc.
function SpotForm({ player }: { player: Player }) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [sharesStr, setSharesStr] = useState("10");

  const live = useStore((s) => s.livePrices[player.id]);
  const price = live?.price ?? player.currentPrice;
  const onchain = useOnchainTrade();
  const { isConnected } = useAccount();
  const authenticated = useStore((s) => s.authenticated);

  const shares = Math.max(0, Math.floor(Number(sharesStr) || 0));
  const subtotal = useMemo(() => Math.round(shares * price * 100) / 100, [shares, price]);
  const fee = Math.round(subtotal * TRADING_FEE_RATE * 100) / 100;
  const totalCost = side === "BUY" ? subtotal + fee : subtotal - fee;

  const tokenized = !!player.contractAddress;
  const validShares = shares > 0;
  const needsSignIn = !isConnected || !authenticated;

  const submit = () => {
    if (!validShares || !tokenized || needsSignIn) return;
    onchain.trade(player.id, side, shares);
  };

  if (!tokenized) {
    return (
      <div className="rounded-lg border border-white/10 bg-surface/60 p-6 text-center text-sm text-content-secondary">
        <Wallet className="mx-auto mb-2 h-5 w-5" />
        {player.name} isn't tokenized on-chain yet, so spot trading isn't available. You can still
        open a futures position on the Futures tab.
      </div>
    );
  }

  return (
    <>
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
        <Row label={side === "BUY" ? "Total (USDC)" : "You receive (USDC)"} value={formatCurrency(totalCost)} bold />
        <Row label="Settles" value="On-chain · Arc" muted />
      </div>

      {needsSignIn && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs text-primary">
          <Wallet className="h-4 w-4" />
          {!isConnected ? "Connect a wallet to trade." : "Sign in with your wallet to trade."}
        </div>
      )}

      <Button
        fullWidth
        size="lg"
        variant={side === "BUY" ? "success" : "danger"}
        className="mt-4"
        loading={onchain.pending}
        disabled={!validShares || needsSignIn}
        onClick={submit}
      >
        {side === "BUY" ? "Buy" : "Sell"} {shares || ""} {player.symbol}
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
  const open = useOpenFuture();
  const { isConnected } = useAccount();
  const authenticated = useStore((s) => s.authenticated);

  const size = Math.max(0, Math.floor(Number(sizeStr) || 0));
  const notional = Math.round(size * entry * 100) / 100;
  const margin = Math.round((notional / leverage) * 100) / 100;
  const fee = Math.round(notional * TRADING_FEE_RATE * 100) / 100;
  const liq = liquidationPrice(entry, side, leverage);
  const cost = margin + fee;

  const tokenized = !!player.contractAddress;
  const valid = size > 0;
  const needsSignIn = !isConnected || !authenticated;

  const submit = () => {
    if (!valid || needsSignIn || !tokenized) return;
    open.open(player.id, side, size, leverage);
  };

  if (!tokenized) {
    return (
      <div className="rounded-lg border border-white/10 bg-surface/60 p-6 text-center text-sm text-content-secondary">
        <Wallet className="mx-auto mb-2 h-5 w-5" />
        Futures are only available on tokenized players (those with an on-chain market).
      </div>
    );
  }

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
        <Row label="Margin required (USDC)" value={formatCurrency(cost)} bold />
        <div className="flex items-center justify-between">
          <span className="text-content-secondary">Liquidation price</span>
          <span className="font-mono tabular-nums text-down">{formatCurrency(liq)}</span>
        </div>
        <Row label="Settles" value="On-chain · Arc" muted />
      </div>

      {leverage >= 5 && valid && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-gold/20 bg-gold/5 p-2.5 text-xs text-gold">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>High leverage — a {(100 / leverage).toFixed(0)}% move against you triggers liquidation.</span>
        </div>
      )}

      {needsSignIn && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs text-primary">
          <Wallet className="h-4 w-4" />
          {!isConnected ? "Connect a wallet to trade." : "Sign in with your wallet to trade."}
        </div>
      )}

      <Button
        fullWidth
        size="lg"
        variant={side === "LONG" ? "success" : "danger"}
        className="mt-4"
        loading={open.pending}
        disabled={!valid || needsSignIn}
        onClick={submit}
      >
        {side === "LONG" ? "Long" : "Short"} {leverage}x · {player.symbol}
        <Badge variant={side === "LONG" ? "up" : "down"} className="ml-1">{size || 0}</Badge>
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
