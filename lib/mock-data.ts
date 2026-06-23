// ─────────────────────────────────────────────────────────────
// FPI — deterministic mock data layer.
// Drives the entire UI with zero external services. All randomness is
// seeded so server and client render identically (no hydration drift).
// When a real DB is wired up, API routes prefer Prisma and fall back here.
// ─────────────────────────────────────────────────────────────

import type {
  Candle,
  Club,
  LeaderboardEntry,
  League,
  NewsItem,
  NotificationItem,
  Player,
  Position,
  PricePoint,
  Sentiment,
  Transaction,
} from "@/types";

// ---- seeded PRNG (mulberry32) ---------------------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function symbolFor(name: string): string {
  const last = name.split(" ").pop() ?? name;
  return "$" + last.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/g, "").slice(0, 9);
}

// ---- clubs ----------------------------------------------------------
interface ClubSeed {
  name: string;
  shortName: string;
  league: League;
  country: string;
}

const CLUB_SEEDS: ClubSeed[] = [
  { name: "Manchester City", shortName: "MCI", league: "Premier League", country: "England" },
  { name: "Arsenal", shortName: "ARS", league: "Premier League", country: "England" },
  { name: "Liverpool", shortName: "LIV", league: "Premier League", country: "England" },
  { name: "Manchester United", shortName: "MUN", league: "Premier League", country: "England" },
  { name: "Chelsea", shortName: "CHE", league: "Premier League", country: "England" },
  { name: "Tottenham Hotspur", shortName: "TOT", league: "Premier League", country: "England" },
  { name: "Real Madrid", shortName: "RMA", league: "La Liga", country: "Spain" },
  { name: "FC Barcelona", shortName: "BAR", league: "La Liga", country: "Spain" },
  { name: "Atlético Madrid", shortName: "ATM", league: "La Liga", country: "Spain" },
  { name: "Inter Milan", shortName: "INT", league: "Serie A", country: "Italy" },
  { name: "AC Milan", shortName: "MIL", league: "Serie A", country: "Italy" },
  { name: "Juventus", shortName: "JUV", league: "Serie A", country: "Italy" },
  { name: "Napoli", shortName: "NAP", league: "Serie A", country: "Italy" },
  { name: "Bayern Munich", shortName: "BAY", league: "Bundesliga", country: "Germany" },
  { name: "Bayer Leverkusen", shortName: "B04", league: "Bundesliga", country: "Germany" },
  { name: "Borussia Dortmund", shortName: "BVB", league: "Bundesliga", country: "Germany" },
  { name: "Paris Saint-Germain", shortName: "PSG", league: "Ligue 1", country: "France" },
  { name: "AS Monaco", shortName: "ASM", league: "Ligue 1", country: "France" },
];

export const CLUBS: Club[] = CLUB_SEEDS.map((c, i) => ({
  id: `club_${i + 1}`,
  name: c.name,
  shortName: c.shortName,
  league: c.league,
  country: c.country,
  logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(c.shortName)}&background=1a1a24&color=8888aa&bold=true&size=64`,
}));

const clubByShort = (s: string): Club =>
  CLUBS.find((c) => c.shortName === s) ?? CLUBS[0];

// ---- player seeds ---------------------------------------------------
interface PlayerSeed {
  name: string;
  pos: Position;
  club: string; // shortName
  nat: string;
  natCode: string;
  age: number;
  tier: number; // 1 superstar .. 4 prospect (drives baseValue)
}

const PLAYER_SEEDS: PlayerSeed[] = [
  { name: "Erling Haaland", pos: "FWD", club: "MCI", nat: "Norway", natCode: "no", age: 24, tier: 1 },
  { name: "Kylian Mbappé", pos: "FWD", club: "RMA", nat: "France", natCode: "fr", age: 26, tier: 1 },
  { name: "Jude Bellingham", pos: "MID", club: "RMA", nat: "England", natCode: "gb", age: 21, tier: 1 },
  { name: "Vinícius Júnior", pos: "FWD", club: "RMA", nat: "Brazil", natCode: "br", age: 24, tier: 1 },
  { name: "Lamine Yamal", pos: "FWD", club: "BAR", nat: "Spain", natCode: "es", age: 17, tier: 1 },
  { name: "Mohamed Salah", pos: "FWD", club: "LIV", nat: "Egypt", natCode: "eg", age: 32, tier: 1 },
  { name: "Bukayo Saka", pos: "FWD", club: "ARS", nat: "England", natCode: "gb", age: 23, tier: 1 },
  { name: "Rodri", pos: "MID", club: "MCI", nat: "Spain", natCode: "es", age: 28, tier: 1 },
  { name: "Harry Kane", pos: "FWD", club: "BAY", nat: "England", natCode: "gb", age: 31, tier: 1 },
  { name: "Victor Osimhen", pos: "FWD", club: "NAP", nat: "Nigeria", natCode: "ng", age: 26, tier: 1 },
  { name: "Florian Wirtz", pos: "MID", club: "B04", nat: "Germany", natCode: "de", age: 21, tier: 1 },
  { name: "Phil Foden", pos: "MID", club: "MCI", nat: "England", natCode: "gb", age: 24, tier: 1 },
  { name: "Pedri", pos: "MID", club: "BAR", nat: "Spain", natCode: "es", age: 22, tier: 1 },
  { name: "Federico Valverde", pos: "MID", club: "RMA", nat: "Uruguay", natCode: "uy", age: 26, tier: 1 },
  { name: "Martin Ødegaard", pos: "MID", club: "ARS", nat: "Norway", natCode: "no", age: 26, tier: 2 },
  { name: "Lautaro Martínez", pos: "FWD", club: "INT", nat: "Argentina", natCode: "ar", age: 27, tier: 2 },
  { name: "Rafael Leão", pos: "FWD", club: "MIL", nat: "Portugal", natCode: "pt", age: 25, tier: 2 },
  { name: "Jamal Musiala", pos: "MID", club: "BAY", nat: "Germany", natCode: "de", age: 22, tier: 1 },
  { name: "Declan Rice", pos: "MID", club: "ARS", nat: "England", natCode: "gb", age: 26, tier: 2 },
  { name: "Achraf Hakimi", pos: "DEF", club: "PSG", nat: "Morocco", natCode: "ma", age: 26, tier: 2 },
  { name: "Virgil van Dijk", pos: "DEF", club: "LIV", nat: "Netherlands", natCode: "nl", age: 33, tier: 2 },
  { name: "Rúben Dias", pos: "DEF", club: "MCI", nat: "Portugal", natCode: "pt", age: 27, tier: 2 },
  { name: "William Saliba", pos: "DEF", club: "ARS", nat: "France", natCode: "fr", age: 23, tier: 2 },
  { name: "Alphonso Davies", pos: "DEF", club: "BAY", nat: "Canada", natCode: "ca", age: 24, tier: 2 },
  { name: "Trent Alexander-Arnold", pos: "DEF", club: "LIV", nat: "England", natCode: "gb", age: 26, tier: 2 },
  { name: "Antonio Rüdiger", pos: "DEF", club: "RMA", nat: "Germany", natCode: "de", age: 31, tier: 3 },
  { name: "Alessandro Bastoni", pos: "DEF", club: "INT", nat: "Italy", natCode: "it", age: 25, tier: 2 },
  { name: "Gianluigi Donnarumma", pos: "GK", club: "PSG", nat: "Italy", natCode: "it", age: 25, tier: 2 },
  { name: "Thibaut Courtois", pos: "GK", club: "RMA", nat: "Belgium", natCode: "be", age: 32, tier: 2 },
  { name: "Alisson Becker", pos: "GK", club: "LIV", nat: "Brazil", natCode: "br", age: 32, tier: 2 },
  { name: "Marc-André ter Stegen", pos: "GK", club: "BAR", nat: "Germany", natCode: "de", age: 32, tier: 3 },
  { name: "Ederson", pos: "GK", club: "MCI", nat: "Brazil", natCode: "br", age: 31, tier: 3 },
  { name: "Bruno Fernandes", pos: "MID", club: "MUN", nat: "Portugal", natCode: "pt", age: 30, tier: 2 },
  { name: "Cole Palmer", pos: "MID", club: "CHE", nat: "England", natCode: "gb", age: 22, tier: 1 },
  { name: "Khvicha Kvaratskhelia", pos: "FWD", club: "NAP", nat: "Georgia", natCode: "ge", age: 24, tier: 2 },
  { name: "Dušan Vlahović", pos: "FWD", club: "JUV", nat: "Serbia", natCode: "rs", age: 25, tier: 3 },
  { name: "Ousmane Dembélé", pos: "FWD", club: "PSG", nat: "France", natCode: "fr", age: 27, tier: 2 },
  { name: "Nico Williams", pos: "FWD", club: "BAR", nat: "Spain", natCode: "es", age: 22, tier: 2 },
  { name: "Gabriel Martinelli", pos: "FWD", club: "ARS", nat: "Brazil", natCode: "br", age: 23, tier: 3 },
  { name: "Son Heung-min", pos: "FWD", club: "TOT", nat: "South Korea", natCode: "kr", age: 32, tier: 2 },
  { name: "Dani Olmo", pos: "MID", club: "BAR", nat: "Spain", natCode: "es", age: 26, tier: 3 },
  { name: "Nicolò Barella", pos: "MID", club: "INT", nat: "Italy", natCode: "it", age: 27, tier: 2 },
  { name: "Aurélien Tchouaméni", pos: "MID", club: "RMA", nat: "France", natCode: "fr", age: 24, tier: 2 },
  { name: "Enzo Fernández", pos: "MID", club: "CHE", nat: "Argentina", natCode: "ar", age: 24, tier: 2 },
  { name: "Granit Xhaka", pos: "MID", club: "B04", nat: "Switzerland", natCode: "ch", age: 32, tier: 3 },
  { name: "Désiré Doué", pos: "MID", club: "PSG", nat: "France", natCode: "fr", age: 19, tier: 2 },
  { name: "João Neves", pos: "MID", club: "PSG", nat: "Portugal", natCode: "pt", age: 20, tier: 2 },
  { name: "Warren Zaïre-Emery", pos: "MID", club: "PSG", nat: "France", natCode: "fr", age: 18, tier: 2 },
  { name: "Endrick", pos: "FWD", club: "RMA", nat: "Brazil", natCode: "br", age: 18, tier: 2 },
  { name: "Kobbie Mainoo", pos: "MID", club: "MUN", nat: "England", natCode: "gb", age: 19, tier: 3 },
];

// ---- deterministic player build -------------------------------------
// Player tokens actually deployed on Arc Testnet (see deployments.json).
// Keyed by slug; these players are tradable on-chain, the rest are virtual-only.
const DEPLOYED_TOKENS: Record<string, { address: string; tokenId: number }> = {
  "lamine-yamal": { address: "0x620eE09dcB5e97EA0feAb7Bf85dba6DdD480EbC9", tokenId: 1 },
  "jude-bellingham": { address: "0xab20BdC4176935916e20581AdB0Ee0e2084489b5", tokenId: 2 },
  "victor-osimhen": { address: "0xC81344Cd845E2f6013b49D09355184772738aC20", tokenId: 3 },
  "erling-haaland": { address: "0x6410515ad665B1CBF7637f1dACac3F8f7a15C8Fa", tokenId: 4 },
};

/** Flat list of on-chain player tokens (slug + address) for chain reads. */
export const DEPLOYED_TOKEN_LIST = Object.entries(DEPLOYED_TOKENS).map(
  ([slug, v]) => ({ slug, address: v.address, tokenId: v.tokenId })
);

function buildPlayer(seed: PlayerSeed, index: number): Player {
  const rng = mulberry32(hashString(seed.name) ^ 0x9e3779b9);
  const tierBase = { 1: 90, 2: 60, 3: 35, 4: 18 }[seed.tier] ?? 30;
  const baseValue = Math.round((tierBase + (rng() - 0.5) * 20) * 100) / 100;

  // form 0-100, slightly noisy
  const formRating = Math.round((50 + (rng() - 0.4) * 80) * 10) / 10;
  const clampedForm = Math.max(20, Math.min(99, formRating));
  const rumorScore = Math.round(rng() * 50 * 10) / 10;
  const injuryStatus = rng() < 0.08;
  const performanceIndex = Math.round((clampedForm * 0.7 + (100 - seed.age) * 0.2 + (50 - rumorScore) * 0.1) * 10) / 10;

  // FPI price formula (see lib/pricing-engine.ts for the canonical one)
  const injuryPenalty = injuryStatus ? 30 : 0;
  const fpiMultiplier = 1 + (clampedForm * 0.6 + rumorScore - injuryPenalty) / 100;
  const currentPrice = Math.round(baseValue * fpiMultiplier * 100) / 100;

  const changePct = Math.round((rng() - 0.45) * 18 * 100) / 100;
  const previousPrice = Math.round((currentPrice / (1 + changePct / 100)) * 100) / 100;
  const priceChange24h = Math.round((currentPrice - previousPrice) * 100) / 100;
  const changePct7d = Math.round((rng() - 0.45) * 35 * 100) / 100;

  const totalShares = 10_000_000;
  const sharesAvailable = Math.round(totalShares * (0.25 + rng() * 0.5));
  const marketCap = Math.round(currentPrice * totalShares);
  const volume24h = Math.round(currentPrice * totalShares * (0.001 + rng() * 0.02));

  const matches = Math.round(15 + rng() * 23);
  const goalWeight = seed.pos === "FWD" ? 1 : seed.pos === "MID" ? 0.5 : seed.pos === "DEF" ? 0.1 : 0;
  const goals = Math.round(rng() * 25 * goalWeight);
  const assists = Math.round(rng() * 14 * (goalWeight + 0.2));
  const rating = Math.round((6.4 + (clampedForm / 100) * 2.4) * 100) / 100;

  return {
    id: `player_${index + 1}`,
    apiFootballId: 100000 + index,
    name: seed.name,
    slug: slugify(seed.name),
    position: seed.pos,
    nationality: seed.nat,
    nationalityCode: seed.natCode,
    age: seed.age,
    club: clubByShort(seed.club),
    currentPrice,
    previousPrice,
    priceChange24h,
    priceChangePercent24h: changePct,
    priceChangePercent7d: changePct7d,
    marketCap,
    totalShares,
    sharesAvailable,
    volume24h,
    baseValue,
    formRating: clampedForm,
    rumorScore,
    injuryStatus,
    performanceIndex,
    imageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(seed.name)}&background=6366f1&color=fff&bold=true&size=128`,
    contractAddress: DEPLOYED_TOKENS[slugify(seed.name)]?.address ?? null,
    tokenId: DEPLOYED_TOKENS[slugify(seed.name)]?.tokenId ?? null,
    isActive: true,
    symbol: symbolFor(seed.name),
    stats: {
      season: "2024/25",
      matches,
      goals,
      assists,
      minutesPlayed: matches * Math.round(60 + rng() * 30),
      yellowCards: Math.round(rng() * 8),
      redCards: rng() < 0.15 ? 1 : 0,
      rating,
      form: clampedForm,
    },
  };
}

export const PLAYERS: Player[] = PLAYER_SEEDS.map(buildPlayer);

const playerBySlug = new Map(PLAYERS.map((p) => [p.slug, p]));
const playerById = new Map(PLAYERS.map((p) => [p.id, p]));

// nationality -> ISO-2 code, derived from the seed table (for DB-backed rows
// that only store the nationality string).
const NATIONALITY_CODES: Record<string, string> = Object.fromEntries(
  PLAYER_SEEDS.map((s) => [s.nat, s.natCode])
);
export function nationalityCodeFor(nationality: string): string {
  return NATIONALITY_CODES[nationality] ?? "";
}

export function getAllPlayers(): Player[] {
  return PLAYERS;
}
export function getPlayerBySlug(slug: string): Player | undefined {
  return playerBySlug.get(slug);
}
export function getPlayerById(id: string): Player | undefined {
  return playerById.get(id);
}

// ---- price history / candles ----------------------------------------
const RANGE_CONFIG: Record<string, { points: number; stepSec: number }> = {
  "1H": { points: 60, stepSec: 60 },
  "4H": { points: 80, stepSec: 180 },
  "1D": { points: 96, stepSec: 900 },
  "1W": { points: 84, stepSec: 7200 },
  "1M": { points: 90, stepSec: 28800 },
  ALL: { points: 120, stepSec: 86400 },
};

export function getPriceHistory(playerId: string, range: string = "1D"): PricePoint[] {
  const player = playerById.get(playerId);
  if (!player) return [];
  const cfg = RANGE_CONFIG[range] ?? RANGE_CONFIG["1D"];
  const rng = mulberry32(hashString(playerId + range));
  const now = Math.floor(Date.now() / 1000);
  const points: PricePoint[] = [];
  // walk backwards from current price with mean-reverting noise
  let price = player.currentPrice;
  const drift = player.priceChangePercent24h / 100 / cfg.points;
  for (let i = 0; i < cfg.points; i++) {
    const t = now - (cfg.points - 1 - i) * cfg.stepSec;
    const vol = (rng() - 0.5) * player.currentPrice * 0.02;
    const target = player.currentPrice * (1 - drift * (cfg.points - 1 - i));
    price = price + (target - price) * 0.3 + vol;
    price = Math.max(0.5, price);
    points.push({
      time: t,
      price: Math.round(price * 100) / 100,
      volume: Math.round(rng() * player.volume24h * 0.05),
    });
  }
  // anchor the final point to the live price
  points[points.length - 1].price = player.currentPrice;
  return points;
}

export function getCandles(playerId: string, range: string = "1D"): Candle[] {
  const points = getPriceHistory(playerId, range);
  const candles: Candle[] = [];
  const group = Math.max(1, Math.floor(points.length / 60));
  for (let i = 0; i < points.length; i += group) {
    const slice = points.slice(i, i + group);
    if (slice.length === 0) continue;
    const prices = slice.map((p) => p.price);
    candles.push({
      time: slice[0].time,
      open: prices[0],
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: prices[prices.length - 1],
    });
  }
  return candles;
}

// ---- order book / recent trades -------------------------------------
const ACTORS = ["0xA1b2…9F3c", "midfield_maestro", "scout_99", "0x7d…42", "thefpiwhale", "santi", "0xCa…01", "form_guru", "0x3e…bb", "valuebot"];

export function getRecentTrades(playerId?: string, limit = 12): Transaction[] {
  const rng = mulberry32(hashString((playerId ?? "global") + "trades"));
  const pool = playerId ? [playerById.get(playerId)!].filter(Boolean) : PLAYERS;
  const trades: Transaction[] = [];
  const now = Date.now();
  for (let i = 0; i < limit; i++) {
    const player = pool[Math.floor(rng() * pool.length)] ?? PLAYERS[0];
    const type = rng() > 0.5 ? "BUY" : "SELL";
    const shares = Math.round(5 + rng() * 400);
    const pps = Math.round(player.currentPrice * (1 + (rng() - 0.5) * 0.01) * 100) / 100;
    const total = Math.round(shares * pps * 100) / 100;
    trades.push({
      id: `tx_${playerId ?? "g"}_${i}`,
      playerId: player.id,
      playerName: player.name,
      playerSymbol: player.symbol,
      type,
      shares,
      pricePerShare: pps,
      totalAmount: total,
      fee: Math.round(total * 0.005 * 100) / 100,
      isOnChain: rng() < 0.2,
      txHash: rng() < 0.2 ? `0x${hashString(`${playerId}${i}`).toString(16)}` : null,
      createdAt: new Date(now - i * (60000 + rng() * 600000)).toISOString(),
      actor: ACTORS[Math.floor(rng() * ACTORS.length)],
    });
  }
  return trades;
}

// ---- news -----------------------------------------------------------
const NEWS_TEMPLATES: { headline: (p: Player) => string; summary: (p: Player) => string; sentiment: Sentiment; impact: number }[] = [
  {
    headline: (p) => `${p.name} stars in dominant ${p.club.shortName} win`,
    summary: (p) => `${p.name} was the standout performer, earning a ${p.stats.rating.toFixed(1)} match rating and drawing praise for sustained top-level form this season.`,
    sentiment: "BULLISH",
    impact: 4.5,
  },
  {
    headline: (p) => `Transfer buzz grows around ${p.name}`,
    summary: (p) => `Multiple outlets report elite clubs are monitoring ${p.name}. A confirmed move would significantly reprice the asset.`,
    sentiment: "BULLISH",
    impact: 6,
  },
  {
    headline: (p) => `${p.name} picks up knock in training`,
    summary: (p) => `${p.club.name} are assessing ${p.name} ahead of the weekend. A confirmed injury would apply downward pressure on the index.`,
    sentiment: "BEARISH",
    impact: -5,
  },
  {
    headline: (p) => `${p.name} signs contract extension at ${p.club.shortName}`,
    summary: (p) => `${p.name} has committed his future to ${p.club.name}, removing transfer uncertainty and stabilising valuation.`,
    sentiment: "NEUTRAL",
    impact: 2,
  },
  {
    headline: (p) => `Analysts split on ${p.name} valuation`,
    summary: (p) => `Debate continues over whether ${p.name} is fairly priced after recent fixtures produced mixed underlying numbers.`,
    sentiment: "NEUTRAL",
    impact: 0.5,
  },
];

export function getNewsForPlayer(playerId: string, limit = 5): NewsItem[] {
  const player = playerById.get(playerId);
  if (!player) return [];
  const rng = mulberry32(hashString(playerId + "news"));
  const now = Date.now();
  const items: NewsItem[] = [];
  for (let i = 0; i < limit; i++) {
    const tpl = NEWS_TEMPLATES[Math.floor(rng() * NEWS_TEMPLATES.length)];
    items.push({
      id: `news_${playerId}_${i}`,
      playerId,
      headline: tpl.headline(player),
      summary: tpl.summary(player),
      source: ["The Athletic", "Sky Sports", "ESPN", "BBC Sport", "Fabrizio Romano"][Math.floor(rng() * 5)],
      url: "#",
      sentiment: tpl.sentiment,
      sentimentScore: Math.round((tpl.impact / 6) * 10 * 10) / 10,
      priceImpact: tpl.impact,
      publishedAt: new Date(now - i * (3600000 + rng() * 7200000)).toISOString(),
    });
  }
  return items;
}

export function getGlobalNews(limit = 12): NewsItem[] {
  const rng = mulberry32(hashString("globalnews"));
  const items: NewsItem[] = [];
  const now = Date.now();
  for (let i = 0; i < limit; i++) {
    const player = PLAYERS[Math.floor(rng() * PLAYERS.length)];
    const tpl = NEWS_TEMPLATES[Math.floor(rng() * NEWS_TEMPLATES.length)];
    items.push({
      id: `gnews_${i}`,
      playerId: player.id,
      headline: tpl.headline(player),
      summary: tpl.summary(player),
      source: ["The Athletic", "Sky Sports", "ESPN", "BBC Sport", "Fabrizio Romano"][Math.floor(rng() * 5)],
      url: "#",
      sentiment: tpl.sentiment,
      sentimentScore: Math.round((tpl.impact / 6) * 10 * 10) / 10,
      priceImpact: tpl.impact,
      publishedAt: new Date(now - i * (1800000 + rng() * 5400000)).toISOString(),
    });
  }
  return items;
}

// ---- leaderboard ----------------------------------------------------
const TRADER_NAMES = ["FPI_Whale", "midfield_maestro", "TikiTakaTrader", "GegenpressGains", "xG_Hunter", "TheScout", "BondingCurveBob", "FormGuru", "TransferSniper", "AlphaCapper", "SetPieceSavant", "VARtigo", "PressResistant", "TheGaffer", "MoneyballMo"];

export function getLeaderboard(period: "weekly" | "monthly" | "alltime" = "weekly"): LeaderboardEntry[] {
  const rng = mulberry32(hashString("leaderboard" + period));
  const scale = period === "weekly" ? 30 : period === "monthly" ? 90 : 400;
  const entries: LeaderboardEntry[] = TRADER_NAMES.map((username, i) => {
    const returnPercent = Math.round((scale * (1 - i / TRADER_NAMES.length) + (rng() - 0.3) * 15) * 10) / 10;
    return {
      rank: 0,
      userId: `user_${i + 1}`,
      username,
      image: `https://i.pravatar.cc/64?u=${username}`,
      returnPercent,
      portfolioValue: Math.round((10000 * (1 + returnPercent / 100)) * 100) / 100,
      bestPick: PLAYERS[Math.floor(rng() * PLAYERS.length)].symbol,
      isPremium: rng() < 0.4,
    };
  });
  entries.sort((a, b) => b.returnPercent - a.returnPercent);
  entries.forEach((e, i) => (e.rank = i + 1));
  return entries;
}

// ---- notifications --------------------------------------------------
export function getNotifications(): NotificationItem[] {
  const rng = mulberry32(hashString("notifs"));
  const now = Date.now();
  const samples: Omit<NotificationItem, "id" | "createdAt" | "isRead">[] = [
    { type: "PRICE_ALERT", title: "Price alert hit", message: `${PLAYERS[4].symbol} crossed your target of £${PLAYERS[4].currentPrice.toFixed(2)}`, playerId: PLAYERS[4].id },
    { type: "AI_INSIGHT", title: "Scout Agent flagged value", message: `${PLAYERS[10].name} screening as undervalued vs fair value`, playerId: PLAYERS[10].id },
    { type: "TRANSFER_NEWS", title: "Transfer rumor", message: `Buzz growing around ${PLAYERS[15].name} — index reacting`, playerId: PLAYERS[15].id },
    { type: "TRADE_EXECUTED", title: "Order filled", message: `Bought 120 ${PLAYERS[0].symbol} @ £${PLAYERS[0].currentPrice.toFixed(2)}`, playerId: PLAYERS[0].id },
    { type: "DIVIDEND", title: "Dividend credited", message: "You received £42.80 in monthly holder dividends", playerId: null },
  ];
  return samples.map((s, i) => ({
    ...s,
    id: `notif_${i}`,
    isRead: rng() < 0.4,
    createdAt: new Date(now - i * (1200000 + rng() * 3600000)).toISOString(),
  }));
}

// ---- demo user (read-only identity when no wallet session) ----------
export const DEMO_USER = {
  id: "demo-user",
  name: "Demo Trader",
  email: "demo@fpi.market",
  image: "https://i.pravatar.cc/96?u=demo",
  walletAddress: null as string | null,
};
