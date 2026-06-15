"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import type { Fixture } from "@/lib/openfootball";

const LEAGUES = [
  { code: "en.1", label: "PL" },
  { code: "es.1", label: "La Liga" },
  { code: "it.1", label: "Serie A" },
  { code: "de.1", label: "Bundesliga" },
  { code: "fr.1", label: "Ligue 1" },
];

export function FixturesWidget() {
  const [league, setLeague] = useState("en.1");
  const { data, isLoading } = useApi<{ league: string; upcoming: Fixture[]; recent: Fixture[] }>(
    ["fixtures", league],
    `/api/fixtures?league=${league}`,
    0
  );
  const fixtures = (data?.upcoming?.length ? data.upcoming : data?.recent) ?? [];

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
          <CalendarDays className="h-4 w-4 text-primary" /> Fixtures
        </h3>
        <span className="text-[10px] text-content-secondary">via openfootball</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {LEAGUES.map((l) => (
          <button
            key={l.code}
            onClick={() => setLeague(l.code)}
            className={cn(
              "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
              league === l.code ? "bg-primary/20 text-primary" : "text-content-secondary hover:text-content"
            )}
          >
            {l.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {fixtures.slice(0, 6).map((f, i) => (
            <div key={i} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-white/[0.03]">
              <span className="truncate text-content-secondary">{f.team1}</span>
              <span className="mx-2 shrink-0 font-mono text-xs text-content">
                {f.played && f.score ? `${f.score[0]}–${f.score[1]}` : f.date.slice(5)}
              </span>
              <span className="truncate text-right text-content-secondary">{f.team2}</span>
            </div>
          ))}
          {fixtures.length === 0 && (
            <p className="py-4 text-center text-xs text-content-secondary">No fixtures available.</p>
          )}
        </div>
      )}
    </Card>
  );
}
