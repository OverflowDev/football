"use client";

import Link from "next/link";
import { Rocket, Bell, Clock, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { PlayerAvatar } from "@/components/shared/PlayerAvatar";
import { PriceTag } from "@/components/shared/PriceTag";
import { useApi } from "@/hooks/useApi";
import { useStore } from "@/store";
import { POSITION_COLORS, cn, flagEmoji, formatCurrency, formatNumber, timeAgo } from "@/lib/utils";
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
          <Section title="Live Offerings" hint="Reserve shares before trading opens">
            <div className="grid gap-4 md:grid-cols-2">
              {live.map((ipo) => (
                <LiveCard key={ipo.id} ipo={ipo} />
              ))}
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

function LiveCard({ ipo }: { ipo: IpoListing }) {
  const addToast = useStore((s) => s.addToast);
  const total = ipo.sharesTotal ?? 1;
  const sold = ipo.sharesSold ?? 0;
  const pct = Math.min(100, Math.round((sold / total) * 100));
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

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-surface/60 p-2.5">
          <p className="text-[11px] text-content-secondary">IPO Price</p>
          <p className="font-mono font-semibold">{formatCurrency(ipo.ipoPrice)}</p>
        </div>
        <div className="rounded-lg bg-surface/60 p-2.5">
          <p className="flex items-center gap-1 text-[11px] text-content-secondary">
            <Clock className="h-3 w-3" /> Closes
          </p>
          <p className="font-mono font-semibold">{ipo.endsAt ? timeAgo(ipo.endsAt).replace(" ago", "") : "—"}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-[11px] text-content-secondary">
          <span>{formatNumber(sold)} sold</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <Button
        fullWidth
        className="mt-4"
        onClick={() => addToast({ variant: "success", title: "Shares reserved", description: `${ipo.name} @ ${formatCurrency(ipo.ipoPrice)}` })}
      >
        Reserve shares
      </Button>
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
