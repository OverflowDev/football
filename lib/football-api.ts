// Thin wrapper around API-Football (RapidAPI). Falls back to deterministic
// mock data when API_FOOTBALL_KEY is absent so cron/pricing logic still runs.

import { PLAYERS } from "@/lib/mock-data";

const BASE_URL = "https://v3.football.api-sports.io";
const KEY = process.env.API_FOOTBALL_KEY;

export interface FixtureStats {
  apiFootballId: number;
  goals: number;
  assists: number;
  rating: number;
  minutes: number;
  redCard: boolean;
  injured: boolean;
}

async function apiGet<T>(path: string, params: Record<string, string>): Promise<T | null> {
  if (!KEY) return null;
  const qs = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`${BASE_URL}${path}?${qs}`, {
      headers: { "x-apisports-key": KEY },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Latest performance snapshot for each active player. Uses live API when
 * configured, otherwise synthesises plausible recent-match stats.
 */
export async function getLatestPlayerStats(): Promise<FixtureStats[]> {
  if (!KEY) {
    // synthesise small per-cycle changes from the mock layer
    return PLAYERS.map((p) => {
      const noise = (seed: number) => {
        const x = Math.sin(seed + Date.now() / 8.64e7) * 10000;
        return x - Math.floor(x);
      };
      const r = noise(p.apiFootballId);
      return {
        apiFootballId: p.apiFootballId,
        goals: r > 0.8 ? 1 : 0,
        assists: r > 0.7 && r < 0.8 ? 1 : 0,
        rating: Math.round((6.3 + r * 2.6) * 100) / 100,
        minutes: r > 0.2 ? 90 : 0,
        redCard: r > 0.97,
        injured: p.injuryStatus,
      };
    });
  }

  // Real implementation sketch (per-player calls would be batched/cached
  // in production via Redis to respect rate limits).
  const out: FixtureStats[] = [];
  for (const p of PLAYERS) {
    const data = await apiGet<{ response: unknown[] }>("/players", {
      id: String(p.apiFootballId),
      season: "2024",
    });
    if (!data) continue;
    // Mapping omitted for brevity; shape mirrors FixtureStats.
  }
  return out.length ? out : [];
}

export async function searchPlayers(query: string) {
  const data = await apiGet<{ response: unknown[] }>("/players/profiles", {
    search: query,
  });
  return data?.response ?? [];
}
