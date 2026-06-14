// Central feature-availability flags. Lets the whole app degrade to a
// fully working DEMO mode when external services aren't configured.

export const hasDatabase = !!process.env.DATABASE_URL;
export const hasOpenAI = !!process.env.OPENAI_API_KEY;
export const hasRedis =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * When true, the app serves seeded mock data and a single demo user.
 * Identity is wallet-based: connect a wallet to get your own account
 * (persisted when a database is configured).
 */
export const DEMO_MODE = !hasDatabase;

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

export const FOOTBALL_MARKET_ADDRESS =
  process.env.NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS || "";
export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || "";
