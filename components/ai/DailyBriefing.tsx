"use client";

import { Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/hooks/useApi";
import { SkeletonText } from "@/components/ui/Skeleton";

export function DailyBriefing() {
  const { data, isLoading } = useQuery({
    queryKey: ["briefing"],
    queryFn: () => fetcher<{ briefing: string }>("/api/ai/briefing"),
    staleTime: 1000 * 60 * 30,
  });

  return (
    <div className="card-surface h-full bg-gradient-to-br from-primary/10 to-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex rounded-lg bg-primary/15 p-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
        </span>
        <h3 className="font-display text-sm font-semibold">AI Daily Briefing</h3>
      </div>
      {isLoading ? (
        <SkeletonText lines={4} />
      ) : (
        <p className="text-sm leading-relaxed text-content-secondary">{data?.briefing}</p>
      )}
    </div>
  );
}
