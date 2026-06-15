// openfootball / football.json integration — free, open football data
// (clubs, leagues, fixtures) hosted as static JSON on GitHub. No key required.
// Repo: https://github.com/openfootball/football.json
//
// Player-level stats are sparse in openfootball, so we use it for FIXTURES and
// match results; API-Football still feeds the per-player numbers the pricing
// engine needs. Falls back to a small deterministic fixture set if offline.

const RAW = "https://raw.githubusercontent.com/openfootball/football.json/master";

// season folders to try, newest first
const SEASONS = ["2025-26", "2024-25", "2023-24"];

export const LEAGUES: Record<string, { code: string; name: string }> = {
  "en.1": { code: "en.1", name: "Premier League" },
  "es.1": { code: "es.1", name: "La Liga" },
  "it.1": { code: "it.1", name: "Serie A" },
  "de.1": { code: "de.1", name: "Bundesliga" },
  "fr.1": { code: "fr.1", name: "Ligue 1" },
};

export interface Fixture {
  round: string;
  date: string;
  team1: string;
  team2: string;
  score: [number, number] | null;
  played: boolean;
}

interface OpenFootballFile {
  name: string;
  matches: {
    round?: string;
    date?: string;
    team1: string;
    team2: string;
    score?: { ft?: [number, number] };
  }[];
}

async function fetchSeason(league: string): Promise<OpenFootballFile | null> {
  for (const season of SEASONS) {
    try {
      const res = await fetch(`${RAW}/${season}/${league}.json`, {
        next: { revalidate: 3600 },
      });
      if (res.ok) return (await res.json()) as OpenFootballFile;
    } catch {
      // try next season
    }
  }
  return null;
}

function fallbackFixtures(leagueName: string): { league: string; upcoming: Fixture[]; recent: Fixture[] } {
  const teams = ["Arsenal", "Man City", "Liverpool", "Chelsea", "Tottenham", "Man United"];
  const now = Date.now();
  const upcoming: Fixture[] = [];
  for (let i = 0; i < 5; i++) {
    upcoming.push({
      round: `Matchday ${30 + i}`,
      date: new Date(now + (i + 1) * 2 * 86400000).toISOString().slice(0, 10),
      team1: teams[(i * 2) % teams.length],
      team2: teams[(i * 2 + 1) % teams.length],
      score: null,
      played: false,
    });
  }
  return { league: leagueName, upcoming, recent: [] };
}

export async function getFixtures(
  league = "en.1"
): Promise<{ league: string; upcoming: Fixture[]; recent: Fixture[] }> {
  const meta = LEAGUES[league] ?? LEAGUES["en.1"];
  const data = await fetchSeason(meta.code);
  if (!data) return fallbackFixtures(meta.name);

  const today = new Date().toISOString().slice(0, 10);
  const all: Fixture[] = data.matches
    .filter((m) => m.team1 && m.team2)
    .map((m) => ({
      round: m.round ?? "",
      date: m.date ?? "",
      team1: m.team1,
      team2: m.team2,
      score: m.score?.ft ?? null,
      played: !!m.score?.ft,
    }));

  const upcoming = all.filter((m) => m.date >= today && !m.played).slice(0, 8);
  const recent = all
    .filter((m) => m.played)
    .slice(-8)
    .reverse();

  // if the season hasn't started / no future dates, show the latest matches
  if (upcoming.length === 0 && recent.length === 0) return fallbackFixtures(meta.name);
  return { league: meta.name, upcoming, recent };
}
