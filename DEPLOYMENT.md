# FPI — Deploy & Run Everything

End-to-end guide to run FPI locally, deploy the smart contracts to the **Arc
network** (Circle's EVM chain, where **USDC is the native gas token**), and ship
the full stack to production.

> New to the data layer? Read [DATABASE.md](DATABASE.md) first. This guide
> references it where needed.

**Contents**
1. [Architecture](#1-architecture)
2. [Prerequisites](#2-prerequisites)
3. [Run locally (zero config)](#3-run-locally-zero-config)
4. [Environment variables](#4-environment-variables)
5. [Enable the services](#5-enable-the-services-db-redis-ai-auth-stripe-realtime)
6. [Deploy the contracts to Arc](#6-deploy-the-smart-contracts-to-arc) ← the launch
7. [Wire the frontend to on-chain trading](#7-wire-the-frontend-to-on-chain-trading)
8. [Push prices on-chain (oracle)](#8-push-prices-on-chain-the-oracle)
9. [Deploy the web app (Vercel)](#9-deploy-the-web-app-vercel)
10. [Deploy the realtime socket server](#10-deploy-the-realtime-socket-server)
11. [Production checklist](#11-production-checklist)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js 14 app (Vercel)                                      │
│   • UI + API routes + Vercel Cron                            │
│   • Prisma → Postgres (Railway/Supabase/Neon)               │
│   • Redis (Upstash)  • Claude (Anthropic)                   │
│   • wagmi/viem ──────────────┐                              │
└──────────────────────────────┼──────────────────────────────┘
                               │ reads prices / sends buy & sell txns
                               ▼
                ┌──────────────────────────────┐
                │  Arc network (EVM, gas=USDC)  │
                │   FootballMarket.sol          │
                │   PlayerToken.sol  ($YAMAL…)  │
                │   PriceOracle.sol             │
                │   USDC  0x3600…0000 (system)  │
                └──────────────────────────────┘
                               ▲
        backend oracle signer ─┘ pushes 30-min price updates
```

---

## 2. Prerequisites

- **Node.js 20+** and npm
- A wallet with a **private key** for contract deployment (use a throwaway/dev key)
- **Testnet USDC** for gas on Arc (free faucet — see §6.2)
- Optional: Postgres, Upstash Redis, Anthropic key, Google OAuth, Resend, Stripe

```bash
git clone <your-repo> && cd football
npm install
npm run prisma:generate   # generate the Prisma client
```

---

## 3. Run locally (zero config)

```bash
npm run dev
# http://localhost:3000  → Launch App → /dashboard
```

With no `.env`, FPI runs in **DEMO mode**: 50 mock players, live-simulated prices,
working virtual buy/sell, a demo user with £10,000, and AI agents that stream a
grounded fallback. Everything is browsable without signing in.

---

## 4. Environment variables

Copy the template and fill in only what you want to enable:

```bash
cp .env.example .env
```

Everything degrades gracefully (see `lib/config.ts`). Grouped reference:

| Group | Vars | Needed for |
| --- | --- | --- |
| Database | `DATABASE_URL` (+ optional `DIRECT_URL`) | persistence |
| Redis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | caching |
| Auth | `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`, `RESEND_API_KEY`, `EMAIL_FROM` | login |
| AI | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | live agents |
| Football data | `API_FOOTBALL_KEY`, `NEWS_API_KEY` | real stats/news |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PREMIUM_PRICE_ID`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | premium |
| **Arc / Web3** | `NEXT_PUBLIC_ARC_RPC_URL`, `ARC_TESTNET_RPC_URL`, `NEXT_PUBLIC_USDC_ADDRESS`, `NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS`, `NEXT_PUBLIC_PRICE_ORACLE_ADDRESS`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | on-chain |
| Deployment keys | `PRIVATE_KEY`, `ORACLE_PRIVATE_KEY` | deploy + oracle |
| Cron | `CRON_SECRET` | secure cron routes |

Generate an auth secret: `openssl rand -base64 32`.
Get a WalletConnect project id at [cloud.reown.com](https://cloud.reown.com).

---

## 5. Enable the services (DB, Redis, AI, Auth, Stripe, Realtime)

- **Database** — follow [DATABASE.md](DATABASE.md): set `DATABASE_URL`, then
  `npm run prisma:push && npm run prisma:seed`.
- **Redis** — create an Upstash database, paste the REST URL + token. Without it
  an in-memory cache is used.
- **AI** — set `ANTHROPIC_API_KEY` (model defaults to `claude-sonnet-4-6`).
- **Auth** — set `NEXTAUTH_SECRET` + a provider. Once `NEXTAUTH_SECRET` is set,
  `/dashboard` routes require sign-in (see `middleware.ts`).
  - Google: add `http://localhost:3000/api/auth/callback/google` as a redirect URI.
  - Email magic links: set `RESEND_API_KEY` + verified `EMAIL_FROM`.
- **Stripe** — create a £9.99/mo recurring Price, set `STRIPE_PREMIUM_PRICE_ID`,
  and add a webhook to `/api/stripe/webhook` (events:
  `checkout.session.completed`, `customer.subscription.updated`).
- **Realtime** — run the socket server and point the app at it:
  ```bash
  npx tsx server/socket-server.ts        # listens on :3001
  # .env: NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
  ```
  Without it, the client runs an in-browser price simulator.

---

## 6. Deploy the smart contracts to Arc

Arc is EVM-compatible, so we deploy with Hardhat. The key difference from a normal
EVM chain: **gas is paid in USDC**, and **USDC already exists** as a system
contract — so we do *not* deploy a mock token.

**Arc Testnet parameters** (from <https://docs.arc.io>):

| | |
| --- | --- |
| Network name | Arc Testnet |
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| WebSocket | `wss://rpc.testnet.arc.network` |
| Gas token | **USDC** (native; 18-dec native / 6-dec ERC-20 interface) |
| Explorer | `https://testnet.arcscan.app` |
| Faucet | `https://faucet.circle.com` |
| USDC system contract | `0x3600000000000000000000000000000000000000` |
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` |

All three are pre-wired in `hardhat.config.ts` (`arcTestnet`/`arc`),
`scripts/deploy.js`, and `lib/web3.ts`.

### 6.1 Add Arc to your wallet (optional, for testing in MetaMask)
Network name `Arc Testnet` · RPC `https://rpc.testnet.arc.network` · Chain ID
`5042002` · Currency symbol `USDC` · Explorer `https://testnet.arcscan.app`.

### 6.2 Fund the deployer with gas (USDC)
1. Get your deployer address: `0x…` (the account for `PRIVATE_KEY`).
2. Go to **<https://faucet.circle.com>**, select **Arc Testnet**, paste the
   address, and request **USDC**. This USDC pays for gas.

### 6.3 Configure deployment env
```bash
# .env
PRIVATE_KEY=0xyour_deployer_private_key          # holds testnet USDC for gas
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
# ORACLE_PRIVATE_KEY=0x…   # optional: separate signer for price pushes
```

### 6.4 Compile
```bash
npm run hardhat:compile
```

### 6.5 Deploy
```bash
npm run hardhat:deploy:arc
```

The script (`scripts/deploy.js`) will:
1. Use the **native USDC** at `0x3600…0000` (no MockUSDC on Arc).
2. Deploy `PriceOracle` (admin = deployer).
3. Deploy `FootballMarket(usdc, treasury=deployer)`.
4. Launch starter player tokens (`$YAMAL`, `$BELLINGHAM`, `$OSIMHEN`, `$HAALAND`),
   each minting the full 10M supply to the market as inventory.
5. Write **`deployments.json`** and print the addresses.

Expected tail:
```
✅ Done. Wrote deployments.json
Set in your .env:
  NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS=0x…
  NEXT_PUBLIC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
```

### 6.6 Record the addresses
Copy from `deployments.json` into `.env` (and your Vercel project):
```bash
NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS=0x…   # FootballMarket
NEXT_PUBLIC_PRICE_ORACLE_ADDRESS=0x…      # PriceOracle
NEXT_PUBLIC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
```

### 6.7 Post-deploy wiring
Run these once (via `npx hardhat console --network arcTestnet` or a small script):

- **Grant the oracle role** to your backend signer so the cron can push prices:
  ```js
  const m = await ethers.getContractAt("FootballMarket", MARKET_ADDR);
  await m.grantRole(await m.ORACLE_ROLE(), ORACLE_SIGNER_ADDR);
  ```
- **Seed USDC liquidity** so early *sells* can be paid out before buy inflows
  accumulate (the market pays sellers from its USDC balance):
  ```js
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDR);
  await usdc.transfer(MARKET_ADDR, 1_000_000n); // 1 USDC = 1e6 (6 decimals)
  ```
- **User approvals:** before a wallet buys, it must approve the market to spend
  USDC (the UI does this, or use **Permit2** at `0x0000…78BA3`). 6-decimal amounts.

### 6.8 Verify on Arcscan
Arcscan is Blockscout-based:
```bash
npx hardhat verify --network arcTestnet PRICE_ORACLE_ADDR "DEPLOYER_ADDR"
npx hardhat verify --network arcTestnet MARKET_ADDR "USDC_ADDR" "TREASURY_ADDR"
```
Then browse `https://testnet.arcscan.app/address/<MARKET_ADDR>`.

> **Mainnet:** Arc mainnet addresses/params aren't public yet. When they are, set
> `ARC_RPC_URL` + `ARC_CHAIN_ID` and use `npm run hardhat:deploy:arc-mainnet`.

---

## 7. Wire the frontend to on-chain trading

Once `NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS` + `NEXT_PUBLIC_USDC_ADDRESS` are set:

- The wallet **Connect** button defaults to **Arc Testnet** (`lib/web3.ts`).
- The player page **Trade panel** "On-Chain" toggle becomes usable once a wallet
  is connected.
- On-chain reads/writes use the ABIs in `lib/abi.ts`
  (`getPlayerPrice`, `buyShares`, `sellShares`, `PriceUpdated` events).
- The **On-Chain** tab links to `https://testnet.arcscan.app/address/<token>`.

Map a player to its on-chain token by setting `Player.contractAddress` /
`Player.tokenId` (from `deployments.json`) in the DB, or in `lib/mock-data.ts` for
the demo layer.

---

## 8. Push prices on-chain (the oracle)

`app/api/cron/update-prices` recomputes prices every 30 min. To mirror them
on-chain, add a tiny oracle pusher and call it at the end of that route. Create
`lib/oracle.ts`:

```ts
import { createWalletClient, http, getContract } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "@/lib/web3";
import { FOOTBALL_MARKET_ABI } from "@/lib/abi";

export async function pushPrices(updates: { token: `0x${string}`; price: bigint }[]) {
  const pk = process.env.ORACLE_PRIVATE_KEY as `0x${string}` | undefined;
  const market = process.env.NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS as `0x${string}` | undefined;
  if (!pk || !market || updates.length === 0) return; // no-op if unconfigured

  const account = privateKeyToAccount(pk);
  const client = createWalletClient({ account, chain: arcTestnet, transport: http() });
  await client.writeContract({
    address: market,
    abi: FOOTBALL_MARKET_ABI,
    functionName: "updatePrices",
    args: [updates.map((u) => u.token), updates.map((u) => u.price)],
  });
}
```

Then in `update-prices/route.ts`, after computing `updates`, map tokenized players
to `{ token, price: BigInt(Math.round(newPrice * 1e6)) }` and `await pushPrices(...)`.
Prices are USDC 6-decimals. The signer must hold the `ORACLE_ROLE` (§6.7) and have
USDC for gas. It is a safe no-op when `ORACLE_PRIVATE_KEY` is unset.

---

## 9. Deploy the web app (Vercel)

1. Push the repo to GitHub and **Import** it at [vercel.com](https://vercel.com).
2. Add **Environment Variables** (everything from your `.env` you want in prod):
   at minimum `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
   (= your prod URL), `ANTHROPIC_API_KEY`, the Arc/`NEXT_PUBLIC_*` web3 vars, and
   `CRON_SECRET`.
3. **Build command:** add a release step so migrations run:
   - Set **Build Command** to `prisma migrate deploy && prisma generate && next build`
     (or keep default `next build` and run `prisma migrate deploy` in a release
     hook). Seed once manually against prod: `npm run prisma:seed`.
4. **Cron** is already declared in `vercel.json`:
   - `/api/cron/update-prices` every 30 min
   - `/api/cron/fetch-news` hourly
   - `/api/cron/send-alerts` every 5 min
   Set `CRON_SECRET` — Vercel sends it as `Authorization: Bearer …`; the routes
   reject anything else (`lib/cron.ts`).
5. Update Google OAuth + Stripe webhook URLs to the production domain.

---

## 10. Deploy the realtime socket server

`server/socket-server.ts` is a standalone Node process (Vercel functions can't
hold WebSocket connections).

**Railway / Render / Fly:**
- Start command: `npx tsx server/socket-server.ts`
- Expose the port (`SOCKET_PORT`, default `3001`).
- Set the app's `NEXT_PUBLIC_SOCKET_URL` to the public URL of this service.

If you skip this, the client falls back to the in-browser simulator — fine for
demos, but prices won't be shared across users.

---

## 11. Production checklist

**App**
- [ ] All required env vars set in Vercel (prod + preview)
- [ ] `NEXTAUTH_URL` = production URL, `NEXTAUTH_SECRET` set
- [ ] `prisma migrate deploy` in the build/release step; prod DB seeded once
- [ ] `CRON_SECRET` set; cron routes returning 200
- [ ] Stripe webhook + Google OAuth pointed at prod domain

**Contracts (Arc)**
- [ ] `npm run hardhat:deploy:arc` succeeded; `deployments.json` committed/saved
- [ ] `NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS` / `_USDC_ADDRESS` / `_PRICE_ORACLE_ADDRESS` set in Vercel
- [ ] `ORACLE_ROLE` granted to the backend signer; `ORACLE_PRIVATE_KEY` funded with USDC
- [ ] Market seeded with USDC liquidity for sells
- [ ] Contracts verified on Arcscan
- [ ] Tokenized players have `contractAddress`/`tokenId` set in the DB

---

## 12. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `insufficient funds for gas` on deploy | fund the deployer with **USDC** from `faucet.circle.com` (USDC is gas on Arc) |
| `invalid sender` / chainId mismatch | confirm chain ID `5042002` and `ARC_TESTNET_RPC_URL` |
| Hardhat can't connect | RPC may rate-limit — try an alternate (Blockdaemon/dRPC/QuickNode variants from the Arc docs) |
| `buyShares` reverts | user hasn't `approve`d USDC for the market, or amount < 6-decimal precision |
| `sellShares` reverts / pays 0 | market has no USDC balance yet — seed liquidity (§6.7) |
| Verify fails | Arcscan is Blockscout — no API key needed; ensure exact constructor args |
| On-chain toggle disabled | connect a wallet; `NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS` must be set |
| Cron returns 401 | send `Authorization: Bearer $CRON_SECRET` (Vercel does this automatically) |
| Decimal mismatch | USDC uses **6** decimals in the ERC-20 interface; prices are `price * 1e6` |

---

_Demo platform · virtual currency unless trading on-chain · not investment advice._
