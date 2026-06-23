# soka

A **stock market for football players**. Trade shares of real players like stocks — **on-chain
in USDC on the Arc network** (Circle's EVM chain, where USDC is the native gas token) — with
**leveraged futures**, a bonding-curve pricing engine, live charts and real-time prices.

> 📘 **Guides:** [DATABASE.md](DATABASE.md) (database setup) · [DEPLOYMENT.md](DEPLOYMENT.md)
> (deploy contracts to Arc + ship the full stack). In-app docs live at **`/docs`**.

A single full-stack Next.js 14 app. Browsing works with **zero configuration** (deterministic
mock data, live-simulated prices); **trading is on-chain**, so it needs a connected, signed-in
wallet. There is **no virtual/paper balance and no AI** — identity is your wallet and value is
settled on Arc.

---

## Tech stack

| Layer        | Tech                                                          |
| ------------ | ------------------------------------------------------------ |
| Frontend     | Next.js 14 (App Router), TypeScript (strict), Tailwind, Framer Motion |
| Fonts        | Sora (display/numerics) + Inter (body)                        |
| State / data | Zustand, TanStack Query                                       |
| Backend      | Next.js Route Handlers, Zod validation                        |
| Database     | PostgreSQL + Prisma (Supabase) — optional                     |
| Cache        | Upstash Redis — optional (in-memory fallback)                 |
| Realtime     | Socket.io (standalone server) + in-browser simulator         |
| Charts       | TradingView Lightweight-Charts + Recharts                    |
| Identity     | Wallet-only **SIWE** — Wagmi + Viem + RainbowKit              |
| Contracts    | Solidity (OpenZeppelin) on **Arc**, Hardhat                   |
| Data feeds   | API-Football (player stats) + NewsAPI (news) + openfootball (free fixtures) |

---

## Quick start

```bash
npm install
npm run dev
# open http://localhost:3000  → "Launch App" → /dashboard
```

No `.env` needed to **browse** — the market, players, charts and IPO pages render from mock
data. To **trade**, connect a wallet (RainbowKit), sign in, and use the on-chain layer
(see below).

> If your editor complains about `@prisma/client`, run `npm run prisma:generate` once.

---

## Full setup

1. **Copy env:** `cp .env.example .env` and fill in what you want.
2. **Database (optional, Supabase):**
   ```bash
   npm run prisma:generate
   npm run prisma:push      # create tables
   npm run prisma:seed      # load 18 clubs, 50 players, news
   # IMPORTANT (Supabase): lock down the public REST API after any push
   npx prisma db execute --file prisma/enable-rls.sql --schema prisma/schema.prisma
   ```
   `enable-rls.sql` turns on Row-Level Security for every table. Supabase exposes a public
   PostgREST API; with RLS off, anyone with the anon key could read/write your data. RLS-enabled
   (with no policies) denies that API, while Prisma (the owner role) bypasses RLS and keeps
   working. **Re-run it after any `prisma:push` that adds tables.**
   See [DATABASE.md](DATABASE.md) for the Supabase IPv4 pooler details.
3. **Football data (optional):** `API_FOOTBALL_KEY` (api-sports.io) + `NEWS_API_KEY` (newsapi.org).
4. **Realtime (optional):** run the socket server and set `NEXT_PUBLIC_SOCKET_URL`:
   ```bash
   npx tsx server/socket-server.ts   # :3001
   ```
   Without it, the client runs a local price simulator.
5. **Wallet + on-chain:** set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (cloud.reown.com),
   `SESSION_SECRET` (`openssl rand -hex 32`), and the Arc/contract addresses to enable trading.

Everything degrades gracefully (`lib/config.ts`): no DB → mock data; no Redis → in-memory
cache; no data keys → deterministic mock stats/fixtures.

---

## Identity — wallet sign-in (SIWE)

No email/password, no NextAuth. Sign-in is **Sign-In With Ethereum**:

1. `GET /api/auth/nonce` issues a nonce + the exact message to sign (nonce in an httpOnly cookie).
2. The wallet signs it; `POST /api/auth/verify` checks the nonce, **domain/URI/chain**, and the
   signature (`viem.verifyMessage`), then sets a **signed httpOnly session cookie**.
3. `getCurrentUser()` trusts **only** that server-signed session — never `document.cookie` or a
   wallet address from the request body. Write routes require a verified session in production.

---

## Trading — on-chain spot & futures

The trade panel has two modes, both settled in **USDC on Arc**:

- **Spot** — buy/sell real player share tokens through **`FootballMarket`** (0.5% fee). Available
  for tokenized players (others show "not tokenized"). Flow: `/api/trade/prepare` → wallet signs
  `buyShares`/`sellShares` → `/api/trade/confirm`, where the **server verifies the receipt + the
  `SharesBought/SharesSold` event** (truth from the chain, with txHash replay-protection).
- **Futures** — leveraged long/short (1×–10×) through **`FootballFutures`**: post USDC margin,
  P&L from the live mark price, with a liquidation price and `liquidate()`. Flow:
  `/api/futures/prepare` → approve USDC margin → `openPosition`; positions are **read live from
  the chain** (`/api/futures`); close via `closePosition`.

Your **Portfolio** shows on-chain spot holdings (read from the wallet), open futures positions
(read from the contract), and trade history — no virtual ledger to drift out of sync.

---

## Pricing engine

`lib/pricing-engine.ts` implements the canonical soka formula:

```
Price = BaseValue × (1 + (FormRating + RumorScore − InjuryPenalty)/100) × (Demand/Supply)
```

- **FormRating** 0–100 (goals/assists/ratings) · **RumorScore** 0–50 (transfer-rumor signal)
- **InjuryPenalty** 0 healthy / 30 injured
- **Demand/Supply**: a bonding curve — every buy nudges the next price **+0.1%**, every sell **−0.1%**.

`calculateNewPrice()` layers match/sentiment/demand multipliers with age-based volatility and a
**±20% per-update dampener**. The price cron recomputes all prices, writes `PriceHistory`, and
**pushes them on-chain** via the oracle signer (`updatePrices`). Each player page has a
**Price Drivers** panel explaining *why* a price is moving (goals, transfer links, injury, demand).

---

## IPO Center (`/ipo`) — on-chain presale

An "Initial Player Offering" hub. **Live offerings are fully on-chain** via **`FootballIPO`**, run
as a proportional fair launch:

- A fixed pool of player shares is offered with a deadline.
- Buyers **bid shares at a price** → deposit `shares × price` USDC into the contract.
- The **price/token is the clearing price set collectively by all demand** (`raised ÷ pool`), and
  final allocation is **pro-rata** to each buyer's deposit.
- After close, anyone can `finalize`, then buyers `claim` their shares.

The card shows the live clearing price, total raised, your deposit + allocation, and claim state —
all read live from the chain (`lib/onchain-ipo.ts` → `/api/ipo`). **Upcoming** and **Recently
Listed** rows are off-chain listing metadata (`lib/ipo.ts`). Open sales with `npm run deploy:ipo`.

### Adding a new IPO

**Easiest — in the app:** connect the **deployer wallet** (`NEXT_PUBLIC_ADMIN_ADDRESS`) and an
**Admin · Create IPO** panel appears at the top of `/ipo`. Fill in the player, hit *Deploy & open
sale* — it signs 4 txs from your wallet (deploy share token → mint → approve → `createSale`) and
saves the listing to the `IpoSale` table. No code change, no redeploy. The panel is invisible to
everyone else, and the persist route re-checks the session against the admin address.

**Or via CLI** — open the sale on the **existing** contract, then register its metadata:

```bash
# 1. open a sale on the existing FootballIPO
IPO_NAME="Lamine Yamal" IPO_SYMBOL='$YAMAL2' IPO_CLUB="FC Barcelona" \
IPO_POS=FWD IPO_NAT=es IPO_POOL=1000000 IPO_DAYS=7 npm run add:ipo
```

It prints a ready-to-paste line. **2.** add it to `ON_CHAIN_SALES` in `lib/ipo.ts`:

```ts
{ saleId: 3, playerToken: "0x…", name: "Lamine Yamal", club: "FC Barcelona", position: "FWD", nat: "es" },
```

Redeploy the frontend and the new offering shows up live.

---

## Data sources

- **API-Football** (`API_FOOTBALL_KEY`) — per-player goals/assists/ratings for the engine.
- **NewsAPI** (`NEWS_API_KEY`) — news → sentiment.
- **openfootball** — **free, no key**: fixtures/results from the public `football.json` GitHub
  dataset (`lib/openfootball.ts` → `/api/fixtures` → dashboard Fixtures widget). Cached 1h.

---

## Smart contracts (Arc)

In `contracts/`:

- **`PlayerToken.sol`** — ERC-20 per player (`$YAMAL`…), 10M cap, mintable by platform, burnable.
- **`FootballMarket.sol`** — deploys player tokens, `buyShares`/`sellShares` in USDC (**0.5% fee**),
  oracle-gated `updatePrice(s)`, `getUserPortfolio`, holder `claimDividends`. `Ownable` +
  `AccessControl` + `ReentrancyGuard`, full NatSpec.
- **`FootballFutures.sol`** — leveraged long/short on player prices: USDC margin, 1–10×, P&L,
  `closePosition`, `liquidate()`. Reads mark prices from `FootballMarket`.
- **`FootballIPO.sol`** — on-chain presale: `createSale` (pool of tokens) → `deposit` USDC →
  clearing price = raised ÷ pool → `finalize` → pro-rata `claim`. Claimed tokens become
  spot-tradable via `FootballMarket.listExternalToken` (admin lists + seeds inventory).
- **`PriceOracle.sol`** — auxiliary on-chain price feed (`ORACLE_ROLE`).
- **`MockUSDC.sol`** — 6-decimal faucet token (local/Base-Sepolia only; **not** Arc).

**Arc** uses **USDC as the native gas token**, already deployed as a system contract at
`0x3600…0000`, so no mock token is used there.

```bash
# Fund your deployer with testnet USDC (gas) at https://faucet.circle.com (Arc Testnet)
PRIVATE_KEY=0x...                 # in .env
npm run hardhat:compile
npm run hardhat:deploy:arc        # Oracle + Market + Futures + launch player tokens
# then, to add/update only futures against an existing market:
npm run deploy:futures
FUTURES_FUND_USDC=20 npm run fund:futures   # seed the futures payout pool
```

Chain ID `5042002` · RPC `https://rpc.testnet.arc.network` · explorer `https://testnet.arcscan.app`.
Full walkthrough in **[DEPLOYMENT.md](DEPLOYMENT.md)**.

### Current Arc Testnet deployment

| Contract | Address |
| --- | --- |
| FootballMarket | `0xA92bd443A078ed98184dB792E7A3846937a2f37E` |
| FootballFutures | `0x4E27f853e1Acf170387AB7A99c91C50Cac3485e1` |
| FootballIPO | `0x357aCA9f32F0CD7aa904aBE6468070EbD0eF8C20` |
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
components/               # ui · shared · layout · market · portfolio · landing · providers · auth
hooks/                   # useSocket, usePlayer, useTransactions, useOnchainTrade, useFutures, useSiwe, useNotifications
lib/                     # prisma, market-data, pricing-engine, onchain, onchain-futures, onchain-portfolio,
                         #   futures-math, oracle, siwe, auth-session, session, env, web3, ipo, openfootball, …
store/                   # Zustand global store
types/                   # shared TypeScript types
contracts/ scripts/      # Solidity + Hardhat deploy/fund scripts
prisma/                  # schema + seed
server/                  # standalone Socket.io server
```

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` / `build` / `start` | Dev / production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` / `test:contracts` | Vitest unit tests / Hardhat contract tests |
| `npm run prisma:push` / `seed` / `studio` | DB schema / seed / GUI |
| `npm run hardhat:compile` | Compile contracts |
| `npm run hardhat:deploy:arc` | Deploy all contracts to Arc Testnet |
| `npm run deploy:futures` / `fund:futures` | Deploy + fund FootballFutures |
| `npm run deploy:ipo` | Deploy FootballIPO + open on-chain presales |

---

## Deployment

- **Vercel** — frontend + API + cron (`vercel.json` schedules the cron routes; Hobby = daily).
- **Supabase** — Postgres (`DATABASE_URL` via the IPv4 session pooler — see DATABASE.md).
- **Upstash** — Redis (optional). **Railway/Render** — the Socket.io server (optional).
- Secure cron with `CRON_SECRET`; set `SESSION_SECRET` + the `NEXT_PUBLIC_*` contract addresses
  in the host env (the `NEXT_PUBLIC_*` ones are baked at build time, so set them before building).

---

_Demo/testnet platform · trades settle in testnet USDC on Arc · not investment advice._
