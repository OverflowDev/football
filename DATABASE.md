# FPI — Database Guide

The FPI platform uses **PostgreSQL** via **Prisma**. The app is designed so the
database is **optional**: with no `DATABASE_URL` it runs in DEMO mode on the
deterministic mock layer (`lib/mock-data.ts`). Add a database to persist real
users, portfolios, trades, alerts, and AI chat history.

This guide covers provisioning Postgres, configuring Prisma, seeding, and
day-to-day operations.

---

## 1. How data access works

All reads/writes go through `lib/data.ts` and `lib/trade.ts`, which check
`hasDatabase` (from `lib/config.ts`):

| Condition | Behaviour |
| --- | --- |
| `DATABASE_URL` **unset** | DEMO mode — mock players, in-memory demo portfolio (`lib/demo-store.ts`) |
| `DATABASE_URL` **set** | Prisma is the source of truth for users, portfolios, transactions, alerts, watchlists, notifications, AI chats |

Player/club/price data is always shaped by the canonical mock layer for the UI;
once seeded, the same 50 players live in Postgres so the pricing cron can persist
`PriceHistory` and the contracts can map `contractAddress`/`tokenId`.

---

## 2. Provision a Postgres database

Pick one. Any Postgres 14+ works.

### Option A — Railway (recommended for this project)
1. Create a project at [railway.app](https://railway.app) → **New → Database → PostgreSQL**.
2. Open the service → **Variables** → copy `DATABASE_URL`
   (`postgresql://postgres:…@…railway.app:5432/railway`).

### Option B — Supabase
1. [supabase.com](https://supabase.com) → New project.
2. **Project Settings → Database → Connection string → URI**.
3. Use the **Connection pooling** string (port `6543`) for serverless/Vercel, and
   append `?pgbouncer=true&connection_limit=1`. Use the direct `5432` string for
   migrations (see `directUrl` note below).

### Option C — Neon
1. [neon.tech](https://neon.tech) → new project → copy the pooled connection string.

### Option D — Local (Docker)
```bash
docker run --name fpi-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=fpi -p 5432:5432 -d postgres:16
```
`DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fpi?schema=public"`

---

## 3. Configure the connection

Add to `.env`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?schema=public"
```

> **Serverless pooling (Vercel + Supabase/Neon):** use the pooled URL for
> `DATABASE_URL`, and if you run migrations from a serverless context add a
> `directUrl`. To enable it, add this to `prisma/schema.prisma` datasource and set
> `DIRECT_URL` to the non-pooled (`5432`) connection string:
>
> ```prisma
> datasource db {
>   provider  = "postgresql"
>   url       = env("DATABASE_URL")
>   directUrl = env("DIRECT_URL")
> }
> ```
> (Optional — only needed if you hit "prepared statement already exists" or
> migration errors behind PgBouncer.)

---

## 4. Create the schema & seed

```bash
npm run prisma:generate        # generate the typed client (also runs on install)
npm run prisma:push            # create tables from schema.prisma (no migration history)
npm run prisma:seed            # load 18 clubs, 50 players, stats, news + a demo user
```

Prefer versioned migrations for production instead of `db push`:

```bash
npm run prisma:migrate         # = prisma migrate dev --name <prompted>  (dev)
npx prisma migrate deploy      # apply committed migrations (CI / prod)
```

`prisma migrate deploy` is the command to run in your deploy pipeline; it applies
the SQL files committed under `prisma/migrations/` and never prompts.

### What the seed does (`prisma/seed.ts`)
- Upserts all `Club` rows.
- Upserts all 50 `Player` rows with `PlayerStats` and 3 `NewsItem` each.
- Creates a `demo@fpi.market` user with a starter `Portfolio`.

Re-running the seed is **idempotent** for clubs/players (upserts) but appends
news — clear `NewsItem` first if you re-seed repeatedly.

---

## 5. Schema overview

Defined in [`prisma/schema.prisma`](prisma/schema.prisma):

| Model | Purpose |
| --- | --- |
| `User` | account, `virtualBalance` (default 10,000), premium, `walletAddress`, `stripeCustomerId` |
| `Account` / `Session` / `VerificationToken` | NextAuth (Prisma adapter) |
| `Club` | club metadata (league, country, logo) |
| `Player` | player + live price fields + FPI inputs (`baseValue`, `formRating`, `rumorScore`, `injuryStatus`, `performanceIndex`) + `contractAddress`/`tokenId` |
| `PlayerStats` | per-season goals/assists/rating/form |
| `PriceHistory` | time-series price + `triggerReason` (written by the price cron) |
| `Portfolio` | holdings: shares, avg buy price, total invested |
| `Transaction` | BUY/SELL, fee, `isOnChain`, `txHash` |
| `WatchList` | saved players |
| `Notification` | typed in-app notifications |
| `AIChat` | persisted agent conversations (JSON) |
| `PriceAlert` | target price + direction, triggered flag |
| `NewsItem` | headline/summary + sentiment + price impact |

All money columns are `Decimal` (serialized to `number` at the API edge). Indexes
exist on the hot query paths (`Portfolio.userId`, `Transaction.userId+createdAt`,
`PriceHistory.playerId+timestamp`, etc.).

---

## 6. Common operations

```bash
npm run prisma:studio          # browse/edit data in a local GUI (localhost:5555)
npx prisma db pull             # introspect an existing DB back into schema.prisma
npx prisma migrate reset       # ⚠️ drop, recreate, re-seed (dev only)
npx prisma format              # format schema.prisma
npx prisma validate            # validate schema
```

### Inspect quickly
```bash
psql "$DATABASE_URL" -c "select name, \"currentPrice\" from \"Player\" order by \"marketCap\" desc limit 10;"
```

---

## 7. Backups

- **Railway/Supabase/Neon** provide automated daily backups in their dashboards —
  enable point-in-time recovery for production.
- Manual dump / restore:
  ```bash
  pg_dump "$DATABASE_URL" -Fc -f fpi-backup.dump
  pg_restore --clean --no-owner -d "$DATABASE_URL" fpi-backup.dump
  ```

---

## 8. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Cannot find module '@prisma/client'` | `npm run prisma:generate` |
| `Environment variable not found: DATABASE_URL` | add it to `.env` (and Vercel project env) |
| `P1001 can't reach database server` | check host/port/SSL; some hosts need `?sslmode=require` |
| `prepared statement "s0" already exists` (PgBouncer) | use pooled URL for `DATABASE_URL` + `directUrl` for migrations, or add `?pgbouncer=true` |
| `P3009` failed migration in prod | `npx prisma migrate resolve --rolled-back <name>` then redeploy |
| App still shows mock data | `DATABASE_URL` not picked up, or you haven't seeded — run `prisma:push` + `prisma:seed`, restart |
| Decimal values look like strings | expected from Prisma; the API converts via `Number(...)` before returning |

---

## 9. Production checklist

- [ ] `DATABASE_URL` set in the hosting provider (pooled connection for Vercel)
- [ ] `DIRECT_URL` set if using PgBouncer migrations
- [ ] `npx prisma migrate deploy` runs in the build/release step
- [ ] Seed run once (`npm run prisma:seed`) against the prod DB
- [ ] Automated backups enabled
- [ ] DB in the same region as the app for low latency
