// Explicit, validated environment configuration. Fails loudly in production
// when required secrets are missing instead of silently running insecure paths.

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ORACLE_PRIVATE_KEY: z.string().optional(),
  NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS: z.string().optional(),
  NEXT_PUBLIC_USDC_ADDRESS: z.string().optional(),
  NEXT_PUBLIC_ARC_RPC_URL: z.string().optional(),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  CRON_SECRET: process.env.CRON_SECRET,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ORACLE_PRIVATE_KEY: process.env.ORACLE_PRIVATE_KEY,
  NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS: process.env.NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS,
  NEXT_PUBLIC_USDC_ADDRESS: process.env.NEXT_PUBLIC_USDC_ADDRESS,
  NEXT_PUBLIC_ARC_RPC_URL: process.env.NEXT_PUBLIC_ARC_RPC_URL,
});

export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

// Production must not run on the demo account / insecure session secret.
if (isProd) {
  if (!env.DATABASE_URL) throw new Error("[env] DATABASE_URL is required in production");
  if (!env.SESSION_SECRET) throw new Error("[env] SESSION_SECRET is required in production");
}

/** True when on-chain price pushing is fully configured. */
export const oracleConfigured =
  !!env.ORACLE_PRIVATE_KEY && !!env.NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS;
