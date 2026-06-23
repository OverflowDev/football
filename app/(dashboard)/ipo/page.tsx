"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Rocket, Bell, Clock, TrendingUp, Users, Wallet, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { PlayerAvatar } from "@/components/shared/PlayerAvatar";
import { useApi } from "@/hooks/useApi";
import { useOnchainIpo } from "@/hooks/useIpo";
import { useStore } from "@/store";
import { POSITION_COLORS, cn, flagEmoji, formatCompactCurrency, formatCurrency, formatNumber, timeAgo } from "@/lib/utils";
import type { IpoListing } from "@/types";

export default function IpoPage() {
  const { data, isLoading } = useApi<{ ipos: IpoListing[] }>(["ipos"], "/api/ipo", 30000);
  const ipos = data?.ipos ?? [];
  const live = ipos.filter((i) => i.status === "LIVE");
  const upcoming = ipos.filter((i) => i.status === "UPCOMING");
  const recent = ipos.filter((i) => i.status === "RECENT");

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <span className="inline-flex rounded-xl bg-primary/15 p-2.5">
          <Rocket className="h-5 w-5 text-primary" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold">IPO Center</h1>
          <p className="text-sm text-content-secondary">
            Discover and back the next superstar before trading opens. New players launch at{" "}
            {formatCurrency(10)}/share.
          </p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          {/* LIVE */}
          <Section title="Live Presale" hint="Deposit USDC — buyers set the price/token">
            <div className="grid gap-4 md:grid-cols-2">
              {live.map((ipo) =>
                ipo.isOnChain ? (
                  <OnChainLiveCard key={ipo.id} ipo={ipo} />
                ) : (
                  <LiveCard key={ipo.id} ipo={ipo} />
                )
              )}
            </div>
          </Section>

          {/* UPCOMING */}
          <Section title="Upcoming IPOs" hint="Follow to get notified at launch">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {upcoming.map((ipo) => (
                <UpcomingCard key={ipo.id} ipo={ipo} />
              ))}
            </div>
          </Section>

          {/* RECENT */}
          <Section title="Recently Listed" hint="Now trading on the market">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {recent.map((ipo) => (
                <RecentCard key={ipo.id} ipo={ipo} />
              ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <span className="text-xs text-content-secondary">{hint}</span>
      </div>
      {children}
    </div>
  );
}

function Meta({ ipo }: { ipo: IpoListing }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-content-secondary">
      <span>{flagEmoji(ipo.nationalityCode)}</span>
      {ipo.club}
      <span className={cn("rounded border px-1 text-[10px]", POSITION_COLORS[ipo.position])}>{ipo.position}</span>
    </p>
  );
}

function OnChainLiveCard({ ipo }: { ipo: IpoListing }) {
  const { isConnected } = useAccount();
  const authenticated = useStore((s) => s.authenticated);
  const { deposit, finalize, claim, busy } = useOnchainIpo();

  const saleId = ipo.saleId ?? 0;
  const clearing = ipo.clearingPrice ?? ipo.ipoPrice;
  const ended = ipo.endsAt ? Date.now() > new Date(ipo.endsAt).getTime() : false;
  const finalized = !!ipo.finalized;
  const myShares = ipo.myShares ?? 0;
  const myContribution = ipo.myContribution ?? 0;
  const needsSignIn = !isConnected || !authenticated;

  const [amountStr, setAmountStr] = useState("100");
  const amount = Math.max(0, Number(amountStr) || 0);
  const estShares = clearing > 0 ? Math.floor(amount / clearing) : 0;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PlayerAvatar src={ipo.imageUrl} name={ipo.name} size="lg" />
          <div>
            <p className="font-semibold">{ipo.name}</p>
            <Meta ipo={ipo} />
          </div>
        </div>
        <Badge variant={finalized ? "neutral" : "up"}>{finalized ? "CLOSED" : ended ? "ENDED" : "LIVE"}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-lg bg-surface/60 p-2.5">
          <p className="text-[11px] text-content-secondary">Price / token</p>
          <p className="font-mono font-semibold text-primary">{formatCurrency(clearing)}</p>
        </div>
        <div className="rounded-lg bg-surface/60 p-2.5">
          <p className="text-[11px] text-content-secondary">Raised</p>
          <p className="font-mono font-semibold">{formatCompactCurrency(ipo.raised ?? 0)}</p>
        </div>
        <div className="rounded-lg bg-surface/60 p-2.5">
          <p className="flex items-center gap-1 text-[11px] text-content-secondary">
            <Clock className="h-3 w-3" /> Closes
          </p>
          <p className="font-mono font-semibold">{ipo.endsAt ? timeAgo(ipo.endsAt).replace(" ago", "") : "—"}</p>
        </div>
      </div>

      {myContribution > 0 && (
        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
          <div className="flex justify-between">
            <span className="text-content-secondary">Your deposit</span>
            <span className="font-mono text-content">{formatCurrency(myContribution)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-white/5 pt-1">
            <span className="text-content-secondary">Allocation</span>
            <span className="font-mono font-semibold text-content">{formatNumber(myShares)} shares</span>
          </div>
        </div>
      )}

      {/* actions */}
      {!ended && !finalized && (
        <>
          <div className="mt-4">
            <Input
              label="Deposit (USDC)"
              type="number"
              min={0}
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              leftIcon={<span className="text-sm">$</span>}
            />
            <p className="mt-1.5 text-[11px] text-content-secondary">
              ≈ {formatNumber(estShares)} shares at the current price/token
            </p>
          </div>
          {needsSignIn ? (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs text-primary">
              <Wallet className="h-4 w-4" /> Connect & sign in to join the presale.
            </div>
          ) : null}
          <Button
            fullWidth
            className="mt-3"
            loading={busy === `deposit:${saleId}`}
            disabled={amount <= 0 || needsSignIn}
            onClick={() => deposit(saleId, amount)}
          >
            Deposit {amount > 0 ? formatCurrency(amount) : ""}
          </Button>
        </>
      )}

      {ended && !finalized && (
        <Button fullWidth variant="secondary" className="mt-4" loading={busy === `finalize:${saleId}`} onClick={() => finalize(saleId)}>
          Finalize sale
        </Button>
      )}

      {finalized && (
        myShares > 0 && !ipo.myClaimed ? (
          <Button fullWidth variant="success" className="mt-4" loading={busy === `claim:${saleId}`} onClick={() => claim(saleId)}>
            Claim {formatNumber(myShares)} shares
          </Button>
        ) : (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-content-secondary">
            <CheckCircle2 className="h-4 w-4 text-up" /> {ipo.myClaimed ? "Shares claimed" : "Sale finalized"}
          </p>
        )
      )}

      <p className="mt-2 text-center text-[11px] text-content-secondary">
        Proportional fair launch · price/token = raised ÷ pool · settles on Arc
      </p>
    </Card>
  );
}

function LiveCard({ ipo }: { ipo: IpoListing }) {
  const addToast = useStore((s) => s.addToast);
  const queryClient = useQueryClient();

  const pool = ipo.sharesForSale ?? 1;
  const committed = ipo.sharesCommitted ?? 0;
  const clearing = ipo.clearingPrice ?? ipo.ipoPrice;
  const pct = Math.min(100, Math.round((committed / pool) * 100));

  const [sharesStr, setSharesStr] = useState("100");
  const [priceStr, setPriceStr] = useState(clearing.toFixed(2));
  const [submitting, setSubmitting] = useState(false);

  const shares = Math.max(0, Math.floor(Number(sharesStr) || 0));
  const price = Math.max(0, Number(priceStr) || 0);
  const youCommit = Math.round(shares * price * 100) / 100;
  const valid = shares > 0 && price > 0;

  const submit = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/ipo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipoId: ipo.id, shares, price }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Commit failed");
      addToast({
        variant: "success",
        title: "Bid committed",
        description: `${formatNumber(shares)} ${ipo.name} @ ${formatCurrency(price)} (${formatCurrency(youCommit)})`,
      });
      queryClient.invalidateQueries({ queryKey: ["ipos"] });
    } catch (e) {
      addToast({ variant: "error", title: "Couldn't commit", description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PlayerAvatar src={ipo.imageUrl} name={ipo.name} size="lg" />
          <div>
            <p className="font-semibold">{ipo.name}</p>
            <Meta ipo={ipo} />
          </div>
        </div>
        <Badge variant="up">LIVE</Badge>
      </div>

      {/* presale stats: price/token is set by all buyers */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-lg bg-surface/60 p-2.5">
          <p className="text-[11px] text-content-secondary">Price / token</p>
          <p className="font-mono font-semibold text-primary">{formatCurrency(clearing)}</p>
        </div>
        <div className="rounded-lg bg-surface/60 p-2.5">
          <p className="text-[11px] text-content-secondary">Raised</p>
          <p className="font-mono font-semibold">{formatCompactCurrency(ipo.raised ?? 0)}</p>
        </div>
        <div className="rounded-lg bg-surface/60 p-2.5">
          <p className="flex items-center gap-1 text-[11px] text-content-secondary">
            <Clock className="h-3 w-3" /> Closes
          </p>
          <p className="font-mono font-semibold">{ipo.endsAt ? timeAgo(ipo.endsAt).replace(" ago", "") : "—"}</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[11px] text-content-secondary">
          <span>{formatNumber(committed)} / {formatNumber(pool)} committed</span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {ipo.contributors ?? 0} · {pct}%
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* your committed bids + allocation preview */}
      {(ipo.myShares ?? 0) > 0 && (
        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-content-secondary">Your bids</span>
            <span className="font-mono text-content">
              {formatNumber(ipo.myShares ?? 0)} @ avg {formatCurrency(ipo.myAvgPrice ?? 0)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-content-secondary">Committed</span>
            <span className="font-mono text-content">{formatCurrency(ipo.myContribution ?? 0)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-white/5 pt-1">
            <span className="text-content-secondary">At clearing {formatCurrency(clearing)}</span>
            <span className="font-mono font-semibold text-content">
              {formatNumber(ipo.myShares ?? 0)} ≈ {formatCurrency((ipo.myShares ?? 0) * clearing)}
            </span>
          </div>
        </div>
      )}

      {/* commit form: enter your bid (amount + price) */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Input
          label="Shares"
          type="number"
          min={0}
          value={sharesStr}
          onChange={(e) => setSharesStr(e.target.value)}
        />
        <Input
          label="Your price"
          type="number"
          min={0}
          step="0.01"
          value={priceStr}
          onChange={(e) => setPriceStr(e.target.value)}
          leftIcon={<span className="text-sm">$</span>}
        />
      </div>

      <div className="mt-2 flex items-center justify-between rounded-lg bg-surface/60 px-3 py-2 text-xs">
        <span className="text-content-secondary">You commit</span>
        <span className="font-mono font-semibold">{formatCurrency(youCommit)}</span>
      </div>

      <Button fullWidth className="mt-3" loading={submitting} disabled={!valid} onClick={submit}>
        Commit bid
      </Button>
      <p className="mt-2 text-center text-[11px] text-content-secondary">
        The price/token is set collectively by all buyers' bids.
      </p>
    </Card>
  );
}

function UpcomingCard({ ipo }: { ipo: IpoListing }) {
  const addToast = useStore((s) => s.addToast);
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <PlayerAvatar src={ipo.imageUrl} name={ipo.name} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{ipo.name}</p>
          <Meta ipo={ipo} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-content-secondary">Lists</span>
        <span className="font-medium">
          {ipo.listingDate ? timeAgo(ipo.listingDate).replace(" ago", "") : "soon"}
        </span>
      </div>
      <Button
        fullWidth
        size="sm"
        variant="secondary"
        className="mt-3"
        onClick={() => addToast({ variant: "info", title: "Following IPO", description: `We'll notify you when ${ipo.name} lists` })}
      >
        <Bell className="h-3.5 w-3.5" /> Notify me
      </Button>
    </Card>
  );
}

function RecentCard({ ipo }: { ipo: IpoListing }) {
  return (
    <Link href={`/market/${ipo.slug}`}>
      <Card className="p-4 transition-colors hover:border-primary/30">
        <div className="flex items-center gap-3">
          <PlayerAvatar src={ipo.imageUrl} name={ipo.name} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{ipo.name}</p>
            <Meta ipo={ipo} />
          </div>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-[11px] text-content-secondary">IPO → Now</p>
            <p className="font-mono text-sm">
              {formatCurrency(ipo.ipoPrice)} → {formatCurrency(ipo.currentPrice ?? 0)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-up/10 px-1.5 py-0.5 font-mono text-xs text-up">
            <TrendingUp className="h-3 w-3" />+{ipo.gainPercent}%
          </span>
        </div>
      </Card>
    </Link>
  );
}
