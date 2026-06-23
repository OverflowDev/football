import Link from "next/link";
import type { Metadata } from "next";
import {
  Activity,
  ArrowLeft,
  TrendingUp,
  Coins,
  Wallet,
  Radio,
  Database,
  ShieldCheck,
} from "lucide-react";
import { AuroraBackground } from "@/components/landing/AuroraBackground";
import { SokaMark } from "@/components/brand/SokaLogo";

export const metadata: Metadata = {
  title: "Docs · soka",
  description: "What soka is, how we built it, and how it works.",
};

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "how-it-works", label: "How it works" },
  { id: "pricing", label: "The pricing engine" },
  { id: "trading", label: "Spot & Futures" },
  { id: "ipo", label: "IPO Center" },
  { id: "realtime", label: "Live updates" },
  { id: "identity", label: "Wallet identity" },
  { id: "architecture", label: "Architecture" },
  { id: "contracts", label: "Smart contracts" },
  { id: "running", label: "Running it" },
];

const CONTRACTS = [
  ["FootballMarket", "0x8814FAf3eBA5684AB1deac17FFfb45AF334b9781"],
  ["FootballFutures", "0xF6D58034ccF677c36183C346ff14ECd427628b23"],
  ["PriceOracle", "0xe971d008A04739663be5B0Ad597fDf06569B5420"],
  ["USDC (native)", "0x3600000000000000000000000000000000000000"],
  ["$YAMAL", "0x5195326808fc51326b489c5689698C53871bDaD2"],
  ["$BELLINGHAM", "0xA4943d61Ca71c9fFB9cEb007B2Aa69ec1A8b7d4b"],
  ["$OSIMHEN", "0x538F0044A68739874b973018db3458C501872803"],
  ["$HAALAND", "0x5e52568DD602bf00e9326e6D2B3C31E97649C0cC"],
];

const STACK = [
  ["Frontend", "Next.js 14 (App Router), TypeScript, Tailwind, Framer Motion"],
  ["State / data", "Zustand + TanStack Query"],
  ["Backend", "Next.js Route Handlers + Zod validation"],
  ["Database", "PostgreSQL + Prisma (Supabase)"],
  ["Realtime", "Socket.io + in-browser simulator"],
  ["Charts", "TradingView Lightweight-Charts + Recharts"],
  ["Identity", "Wallet-only — Wagmi + Viem + RainbowKit"],
  ["Chain", "Arc (Circle's EVM L1, gas paid in USDC)"],
  ["Contracts", "Solidity + OpenZeppelin, Hardhat"],
  ["Data", "API-Football (player stats) + NewsAPI + openfootball (free fixtures)"],
];

export default function DocsPage() {
  return (
    <div className="relative min-h-screen">
      <AuroraBackground />

      {/* nav */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2">
            <SokaMark size={30} />
            <span className="font-display text-lg font-bold lowercase">soka</span>
            <span className="ml-1 rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-content-secondary">
              Docs
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/" className="rounded-lg px-3 py-2 text-sm text-content-secondary hover:text-content">
              <ArrowLeft className="mr-1 inline h-3.5 w-3.5" /> Home
            </Link>
            <Link
              href="/dashboard"
              className="btn-base h-9 bg-primary px-4 text-sm text-white hover:bg-primary/90"
            >
              Launch App
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[200px_1fr]">
        {/* TOC */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-content-secondary">
              On this page
            </p>
            <nav className="space-y-1 border-l border-white/10">
              {TOC.map((t) => (
                <a
                  key={t.id}
                  href={`#${t.id}`}
                  className="-ml-px block border-l border-transparent py-1 pl-3 text-sm text-content-secondary hover:border-primary hover:text-content"
                >
                  {t.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* content */}
        <article className="max-w-3xl space-y-14">
          <header>
            <h1 className="font-display text-4xl font-bold tracking-tight">
soka <span className="text-gradient">Documentation</span>
            </h1>
            <p className="mt-3 text-lg text-content-secondary">
              soka is a stock market for football players.
              You trade shares of real players like stocks; prices move with form, transfers
              and market demand, with leveraged futures and on-chain settlement on the Arc network.
            </p>
          </header>

          <Section id="overview" icon={<TrendingUp className="h-5 w-5 text-up" />} title="What we built">
            <p>
              soka turns each footballer into a tradable asset. Tokenized players are real ERC-20
              tokens on Arc; you trade them <strong>on-chain in USDC</strong> by connecting and
              signing in with a wallet. There's no virtual/paper money — value is settled on-chain.
            </p>
            <Bullets
              items={[
                "50 players across the top-5 European leagues, each with stats, news and a live price.",
                "On-chain spot trading in USDC, plus leveraged Futures (long/short up to 10×).",
                "An IPO Center where new players list and the market discovers their value.",
                "A pro trading UI: candlestick/line charts, order book, Price Drivers, watchlists, alerts, live ticker.",
                "Wallet-only identity (SIWE) — connect + sign in, no email/password.",
                "Arc network, where USDC is both the settlement currency and the gas token.",
              ]}
            />
          </Section>

          <Section id="how-it-works" icon={<Activity className="h-5 w-5 text-primary" />} title="How it works (in one picture)">
            <Pre>{`Football data (API-Football, NewsAPI)
        │
        ▼
soka pricing engine ──►  Postgres (prices, history, news)
        │                         ▲
        ▼                         │
  price:update  ──►  Socket.io  ──► live UI (flashing prices, ticker)
        │
        ▼
  oracle signer  ──►  FootballMarket.updatePrices()  (on Arc)
                                  ▲
       wallet ── buy/sell USDC ───┘`}</Pre>
            <p>
              The football <em>data</em> is external; the share <em>price</em> is computed by us
              and is the heart of the system. Here's how it's calculated.
            </p>
          </Section>

          <Section id="pricing" icon={<TrendingUp className="h-5 w-5 text-up" />} title="The pricing engine">
            <p>The canonical soka price formula (<code>lib/pricing-engine.ts</code>):</p>
            <Pre>{`Price = BaseValue
      × (1 + (FormRating + RumorScore − InjuryPenalty) / 100)
      × (Demand / Supply)`}</Pre>
            <Bullets
              items={[
                "FormRating (0–100): derived from goals, assists and match ratings.",
                "RumorScore (0–50): transfer-rumor signal from the news feed.",
                "InjuryPenalty: 0 if fit, 30 if injured.",
                "Demand/Supply: a bonding curve — every BUY raises the next share price by 0.1%, every SELL lowers it by 0.1%.",
              ]}
            />
            <p>
              On top of that structural value, <code>calculateNewPrice()</code> layers short-term
              event multipliers (a goal +2%, an assist +1%, a red card −3%, transfer confirmed
              +15%, injury −8%, plus order-flow demand), scales them by an age-based volatility
              factor (young players move more), and applies a <strong>±20% dampener per update</strong>{" "}
              so no single tick is wild. A cron recomputes all prices every 30 minutes and writes
              a <code>PriceHistory</code> row.
            </p>
          </Section>

          <Section id="trading" icon={<Coins className="h-5 w-5 text-gold" />} title="Spot & Futures (on-chain)">
            <p>Two modes, both settled in USDC on Arc:</p>
            <Bullets
              items={[
                "Spot — buy/sell real player share tokens through FootballMarket (0.5% fee). prepare → wallet signs buyShares/sellShares → confirm, where the SERVER verifies the receipt + event (truth from the chain, with txHash replay-protection).",
                "Futures — leveraged long/short (1×–10×) through FootballFutures. Post USDC margin; margin = notional ÷ leverage; P&L from the live mark price; each position has a liquidation price and can be liquidated.",
              ]}
            />
            <p>
              Spot fees split 90/10 to treasury / a holder dividend pool (<code>claimDividends()</code>).
              Your Portfolio reads on-chain spot holdings from the wallet and futures positions from the
              contract — no virtual ledger, so nothing drifts out of sync.
            </p>
          </Section>

          <Section id="ipo" icon={<TrendingUp className="h-5 w-5 text-primary" />} title="IPO Center">
            <p>
              The <code>/ipo</code> tab is where new players enter the market — an "Initial Player
              Offering" hub with three rows:
            </p>
            <Bullets
              items={[
                "Upcoming — players listing soon; follow to get notified at launch.",
                "Live — currently in their offering window, with IPO price, a shares-sold progress bar, a countdown, and a reserve button.",
                "Recently Listed — just started trading, showing IPO → current price gain and linking to the player.",
              ]}
            />
            <p>
              New players fair-launch at a fixed price (default $10) and the market reprices them
              from there — so a complete unknown and a superstar both start equal and the market
              decides their value.
            </p>
          </Section>

          <Section id="realtime" icon={<Radio className="h-5 w-5 text-emerald-400" />} title="Live updates">
            <p>
              Prices animate in real time. A standalone Socket.io server emits{" "}
              <code>price:update</code>, <code>market:ticker</code> and <code>trade:executed</code>{" "}
              events; the client merges them into a Zustand store and flashes each price green/red
              on change. With no socket server configured, an in-browser simulator drives the same
              effect, so the experience is identical out of the box.
            </p>
          </Section>

          <Section id="identity" icon={<Wallet className="h-5 w-5 text-primary" />} title="Wallet identity (SIWE)">
            <p>
              No email or password — <strong>your wallet is your account</strong>, via Sign-In With
              Ethereum. The server issues a nonce, the wallet signs it, and the server verifies the
              signature (plus domain, URI and chain) before setting a <strong>signed httpOnly
              session cookie</strong>. The backend trusts only that session — never a client-set
              cookie or an address from the request body — and write routes require a verified
              session. You can browse without a wallet; trading needs one connected and signed in.
            </p>
          </Section>

          <Section id="architecture" icon={<Database className="h-5 w-5 text-primary" />} title="Architecture">
            <p>
              One full-stack Next.js 14 app. Every external service is optional and degrades
              gracefully — with nothing configured it runs in DEMO mode on deterministic mock data.
            </p>
            <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <tbody>
                  {STACK.map(([k, v], i) => (
                    <tr key={k} className={i % 2 ? "bg-white/[0.02]" : ""}>
                      <td className="w-40 border-b border-white/5 px-4 py-2.5 font-medium text-content">{k}</td>
                      <td className="border-b border-white/5 px-4 py-2.5 text-content-secondary">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="contracts" icon={<ShieldCheck className="h-5 w-5 text-sky-400" />} title="Smart contracts (Arc)">
            <p>
              Solidity + OpenZeppelin, deployed on Arc Testnet (chain ID <code>5042002</code>).
              <code> FootballMarket</code> runs the spot market and holds each player's price;{" "}
              <code>FootballFutures</code> runs leveraged long/short positions (USDC margin,
              liquidation), reading marks from the market; <code>PlayerToken</code> is the ERC-20
              per player (10M supply); <code>PriceOracle</code> is an auxiliary feed. Price writes
              are gated behind <code>ORACLE_ROLE</code> so only the platform's backend signer can
              update them.
            </p>
            <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-content-secondary">
                    <th className="px-4 py-2.5">Contract</th>
                    <th className="px-4 py-2.5">Address (Arc Testnet)</th>
                  </tr>
                </thead>
                <tbody>
                  {CONTRACTS.map(([name, addr]) => (
                    <tr key={name} className="border-t border-white/5">
                      <td className="px-4 py-2.5 font-medium">{name}</td>
                      <td className="px-4 py-2.5">
                        <a
                          href={`https://testnet.arcscan.app/address/${addr}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          {addr}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-content-secondary">
              Explorer: <a className="text-primary hover:underline" href="https://testnet.arcscan.app" target="_blank" rel="noreferrer">testnet.arcscan.app</a>.
              Gas is paid in USDC (the native token on Arc).
            </p>
          </Section>

          <Section id="running" icon={<Activity className="h-5 w-5 text-primary" />} title="Running it">
            <Pre>{`npm install
npm run dev          # zero-config demo at http://localhost:3000

# optional: real database (Supabase)
npm run prisma:push && npm run prisma:seed

# optional: deploy contracts to Arc
npm run hardhat:compile
npm run hardhat:deploy:arc`}</Pre>
            <p className="text-sm text-content-secondary">
              Full setup, database and deployment guides are in the repo:{" "}
              <code>README.md</code>, <code>DATABASE.md</code> and <code>DEPLOYMENT.md</code>.
            </p>
          </Section>

          <p className="border-t border-white/5 pt-6 text-xs text-content-secondary">
            Testnet platform · trades settle in testnet USDC on Arc · not investment advice.
          </p>
        </article>
      </div>
    </div>
  );
}

function Section({
  id,
  icon,
  title,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-3 flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
        <span className="inline-flex rounded-lg bg-white/5 p-1.5 ring-1 ring-white/5">{icon}</span>
        {title}
      </h2>
      <div className="space-y-3 leading-relaxed text-content-secondary [&_code]:rounded [&_code]:bg-white/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-content [&_strong]:text-content">
        {children}
      </div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function Pre({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-white/10 bg-surface/80 p-4 font-mono text-xs leading-relaxed text-content-secondary">
      {children}
    </pre>
  );
}
