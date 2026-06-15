# FPI — Football Performance Index

A **stock market for football players**. Trade shares of real players like stocks, with
AI-powered analytics, live price movements, a bonding-curve pricing engine, and on-chain
settlement on the **Arc network** (Circle's EVM chain, where **USDC is the native gas token**).

> 📘 **Guides:** [DATABASE.md](DATABASE.md) (database setup) · [DEPLOYMENT.md](DEPLOYMENT.md)
> (deploy contracts to Arc + ship the full stack). In-app docs live at **`/docs`**.

Built as a single full-stack Next.js 14 app. **It boots with zero configuration** — without
any API keys or a database it runs in **DEMO mode** on deterministic mock data (50 players,
live-simulated prices, working virtual trading, streaming AI fallbacks). Add env vars to
progressively light up Postgres, OpenAI, real football data, and the on-chain layer.

**Identity is your wallet** — connect with RainbowKit, no email/password. There's no premium
tier; every feature (including the AI agents) is free.

---

## Tech stack

| Layer        | Tech                                                          |
| ------------ | ------------------------------------------------------------ |
| Frontend     | Next.js 14 (App Router), TypeScript (strict), Tailwind, Framer Motion |
| Fonts        | Sora (display/numerics) + Inter (body)                        |
| State / data | Zustand, TanStack Query                                       |
| Backend      | Next.js Route Handlers, Zod validation                        |
| Database     | PostgreSQL + Prisma (Supabase)                                |
| Cache        | Upstash Redis — optional (in-memory fallback)                 |
| AI           | OpenAI (`gpt-4o`), streaming + JSON mode                      |
| Realtime     | Socket.io (standalone server) + in-browser simulator         |
| Charts       | TradingView Lightweight-Charts + Recharts                    |
| Identity     | Wallet-only — Wagmi + Viem + RainbowKit                       |
| Contracts    | Solidity (OpenZeppelin) on **Arc**, Hardhat                   |
| Data feeds   | API-Football (player stats) + NewsAPI (news) + openfootball (free fixtures) |

---

## Quick start (zero config)

```bash
npm install
npm run dev
# open http://localhost:3000  → "Launch App" → /dashboard
```

No `.env` needed. You're dropped into DEMO mode as a demo trader with £10,000 virtual,
a starter portfolio, live-flashing prices, working buy/sell, and AI agents that stream a
grounded demo response.

> If your editor complains about `@prisma/client`, run `npm run prisma:generate` once.

---

## Full setup

1. **Copy env:** `cp .env.example .env` and fill in what you want to enable.
2. **Database (optional, Supabase):**
   ```bash
   npm run prisma:generate
   npm run prisma:push      # create tables
   npm run prisma:seed      # load 18 clubs, 50 players, news, demo user
   ```
   See [DATABASE.md](DATABASE.md) for the Supabase pooler/IPv4 details.
3. **AI (optional):** set `OPENAI_API_KEY` (model defaults to `gpt-4o`).
4. **Football data (optional):** `API_FOOTBALL_KEY` (api-sports.io) + `NEWS_API_KEY` (newsapi.org).
5. **Realtime (optional):** run the socket server in a second terminal and set
   `NEXT_PUBLIC_SOCKET_URL=http://localhost:3001`:
   ```bash
   npx tsx server/socket-server.ts
   ```
   Without it, the client runs a local price simulator.
6. **Wallet (optional):** set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (cloud.reown.com) for
   wallet connect, then the Arc/contract vars to enable on-chain trading.

### Feature flags

Everything degrades gracefully (see `lib/config.ts`):

- No `DATABASE_URL` → `DEMO_MODE` (mock data + a shared demo account, no DB).
- No `OPENAI_API_KEY` → AI streams a grounded canned response.
- No `API_FOOTBALL_KEY` / `NEWS_API_KEY` → deterministic mock stats & news.
- No Upstash → in-memory cache.
- No wallet connected → you browse as the demo account; connect to get your own.

---

## How identity works (wallet-only)

There is no NextAuth, no email, no password. When you connect a wallet:

1. `WalletSync` writes an `fpi_wallet` cookie with your address.
2. `lib/session.ts#getCurrentUser` reads that cookie and **upserts a user keyed by wallet
   address** (when a DB is configured), so your portfolio/trades are tied to your wallet.
3. No wallet → a shared demo account, so the app is always usable.

---

## Pricing engine

`lib/pricing-engine.ts` implements the canonical FPI formula:

```
Price = BaseValue × (1 + (FormRating + RumorScore − InjuryPenalty)/100) × (Demand/Supply)
```

- **FormRating** 0–100 (goals/assists/ratings) · **RumorScore** 0–50 (AI News Agent)
- **InjuryPenalty** 0 healthy / 30 injured
- **Demand/Supply**: a bonding curve — every buy nudges the next share price **+0.1%**,
  every sell **−0.1%** (`bondingCurveBuyCost` / `bondingCurveSellReturn`).

`calculateNewPrice()` layers short-term match/sentiment/demand multipliers with
age-based volatility and a **±20% per-update dampener**. The 30-min cron recomputes all
prices and writes `PriceHistory`. **Prices are computed by the platform** (the football
*data* is external; the *share price* is ours) and pushed on-chain by the oracle signer.

Each player page shows a **Price Drivers** panel ("📈 up 12% because: goal scored,
transfer links, strong demand") surfacing the same signals the engine uses.

---

## Trading: Spot & Futures

The trade panel has two modes:

- **Spot** — buy/sell actual shares. Sub-toggle for **Virtual** (off-chain virtual
  balance) or **On-Chain** (USDC on Arc via FootballMarket). 0.5% fee.
- **Futures** — **virtual leveraged long/short** (1×–10×): margin = notional ÷ leverage,
  P&L = price move × size, with a computed **liquidation price** and auto-liquidation.
  Off-chain only. See `lib/futures.ts` (+ client-safe math in `lib/futures-math.ts`),
  `/api/futures/open|close`, and the Futures Positions table on the Portfolio page.

> On-chain *futures* (real perps settling in USDC) would need a separate derivatives
> contract — not built. Current futures are virtual.

---

## IPO Center (`/ipo`)

An "Initial Player Offering" hub: **Upcoming** (follow/get notified), **Live** (IPO price,
shares-sold progress bar, countdown, reserve), and **Recently Listed** (IPO→now gain,
links to the tradable player). New players fair-launch at a fixed price (default $10) and
the market reprices from there. Data in `lib/ipo.ts`, served via `/api/ipo`.

---

## Data sources

- **API-Football** (`API_FOOTBALL_KEY`) — per-player goals/assists/ratings for the engine.
- **NewsAPI** (`NEWS_API_KEY`) — news → sentiment.
- **openfootball** — **free, no key**: fixtures/results pulled from the public
  `football.json` GitHub dataset (`lib/openfootball.ts` → `/api/fixtures` → dashboard
  Fixtures widget). Cached 1h with an offline fallback.

---

## AI agents

Four streaming agents under `app/api/ai/*`, each injecting **live FPI data** into the
system prompt (`lib/ai-context.ts`), powered by OpenAI:

- **Scout** — finds undervalued players, returns structured buy recs.
- **Valuation** — fair value, upside %, verdict.
- **Portfolio** — analyses *your* holdings (injected) for risk & rebalancing.
- **News** — maps stories to affected players + predicted price impact.

`/api/ai/insight` returns a strictly-typed `AIInsight` (OpenAI JSON mode with a
deterministic fallback in `lib/ai-insight.ts`).

---

## Smart contracts (Arc)

In `contracts/`:

- **`PlayerToken.sol`** — ERC-20 per player (`$YAMAL`…), 10M cap, mintable by platform, burnable.
- **`FootballMarket.sol`** — deploys player tokens, `buyShares`/`sellShares` in USDC with a
  **0.5% fee**, oracle-gated `updatePrice(s)`, `getUserPortfolio`, and holder `claimDividends`
  (10% of fees). `Ownable` + `AccessControl` + `ReentrancyGuard`, full NatSpec.
- **`PriceOracle.sol`** — auxiliary on-chain price feed (`ORACLE_ROLE`).
- **`MockUSDC.sol`** — 6-decimal faucet token (local/Base-Sepolia only; **not** Arc).

**Arc** is EVM-compatible and uses **USDC as the native gas token**, which already exists as a
system contract at `0x3600…0000` — so no mock token is deployed there.

```bash
# Fund your deployer with testnet USDC (gas) at https://faucet.circle.com (Arc Testnet)
PRIVATE_KEY=0x...           # in .env
npm run hardhat:compile
npm run hardhat:deploy:arc  # Oracle, Market + launch player tokens using native USDC
# writes deployments.json; set NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS + NEXT_PUBLIC_PRICE_ORACLE_ADDRESS
```

Chain ID `5042002` · RPC `https://rpc.testnet.arc.network` · explorer
`https://testnet.arcscan.app`. Full walkthrough (faucet, oracle role, liquidity,
verification, frontend wiring) in **[DEPLOYMENT.md](DEPLOYMENT.md)**.

### Current Arc Testnet deployment

| Contract | Address |
| --- | --- |
| FootballMarket | `0x8814FAf3eBA5684AB1deac17FFfb45AF334b9781` |
| PriceOracle | `0xe971d008A04739663be5B0Ad597fDf06569B5420` |
| USDC (native) | `0x3600000000000000000000000000000000000000` |
| $YAMAL | `0x5195326808fc51326b489c5689698C53871bDaD2` |
| $BELLINGHAM | `0xA4943d61Ca71c9fFB9cEb007B2Aa69ec1A8b7d4b` |
| $OSIMHEN | `0x538F0044A68739874b973018db3458C501872803` |
| $HAALAND | `0x5e52568DD602bf00e9326e6D2B3C31E97649C0cC` |

---

## Project structure

```
app/                     # App Router: (dashboard: dashboard/market/ipo/portfolio/…), api/, docs/, landing
components/               # ui · shared · layout · market · portfolio · ai · landing · providers
hooks/                   # useSocket, usePlayer, usePortfolio, useTrade, useFutures, useAIAgent, useNotifications
lib/                     # prisma, redis, openai, pricing-engine, futures, ipo, openfootball, oracle, data, web3, …
store/                   # Zustand global store
types/                   # shared TypeScript types
contracts/ scripts/      # Solidity + Hardhat deploy
prisma/                  # schema + seed
server/                  # standalone Socket.io server
```

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run prisma:push` / `seed` / `studio` | DB schema / seed / GUI |
| `npm run hardhat:compile` | Compile contracts |
| `npm run hardhat:deploy:arc` | Deploy to Arc Testnet |

---

## Deployment

- **Vercel** — frontend + API + cron (`vercel.json` schedules the three cron routes).
- **Supabase** — Postgres (`DATABASE_URL`, via the IPv4 session pooler — see DATABASE.md).
- **Upstash** — Redis (optional).
- **Railway/Render** — the standalone Socket.io server (optional).
- Secure cron with `CRON_SECRET` (a random token you generate; Vercel Cron sends it as
  `Authorization: Bearer …`).

---

_Demo platform · virtual currency unless trading on-chain · not investment advice._
