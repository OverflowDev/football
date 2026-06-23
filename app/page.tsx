"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Coins,
  ArrowRight,
  ShieldCheck,
  Zap,
  Rocket,
  LineChart,
} from "lucide-react";
import { AuroraBackground } from "@/components/landing/AuroraBackground";
import { HeroPreview } from "@/components/landing/HeroPreview";
import { LandingTicker } from "@/components/landing/LandingTicker";
import { SokaLogo } from "@/components/brand/SokaLogo";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const FEATURES = [
  {
    icon: <TrendingUp className="h-5 w-5 text-up" />,
    title: "Dynamic price discovery",
    body: "Prices recompute from form, transfer rumors and a live bonding curve — every buy and sell moves the market in real time.",
    ring: "hover:border-up/30",
  },
  {
    icon: <Zap className="h-5 w-5 text-primary" />,
    title: "Leveraged futures",
    body: "Go long or short on any player with up to 10× leverage, with on-chain USDC margin and automatic liquidation.",
    ring: "hover:border-primary/30",
  },
  {
    icon: <Coins className="h-5 w-5 text-gold" />,
    title: "On-chain on Arc",
    body: "Each player is an ERC-20 on Arc, where USDC is the native gas token. Trade and earn holder dividends in USDC.",
    ring: "hover:border-gold/30",
  },
  {
    icon: <LineChart className="h-5 w-5 text-emerald-400" />,
    title: "Pro trading UI",
    body: "TradingView charts, order book, watchlists, price alerts and a live ticker — a crypto exchange for footballers.",
    ring: "hover:border-emerald-400/30",
  },
  {
    icon: <ShieldCheck className="h-5 w-5 text-sky-400" />,
    title: "Price Drivers",
    body: "Every player shows why its price is moving — goals, transfer links, injuries and demand — in one clear panel.",
    ring: "hover:border-sky-400/30",
  },
  {
    icon: <Rocket className="h-5 w-5 text-fuchsia-400" />,
    title: "IPO Center",
    body: "Discover and back new players before they list. New listings fair-launch and the market finds their value.",
    ring: "hover:border-fuchsia-400/30",
  },
];

const STATS = [
  { value: "50+", label: "Tradable players" },
  { value: "10×", label: "Max leverage" },
  { value: "0.5%", label: "Trading fee" },
  { value: "USDC", label: "On-chain on Arc" },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AuroraBackground />

      {/* nav */}
      <header className="sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <SokaLogo size={32} />
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/docs"
              className="rounded-lg px-3 py-2 text-sm text-content-secondary transition-colors hover:text-content"
            >
              Docs
            </Link>
            <Link
              href="/market"
              className="hidden rounded-lg px-3 py-2 text-sm text-content-secondary transition-colors hover:text-content sm:block"
            >
              Market
            </Link>
            <Link
              href="/dashboard"
              className="btn-base h-9 bg-primary px-4 text-sm text-white shadow-lg shadow-primary/25 hover:bg-primary/90"
            >
              Launch App
            </Link>
          </nav>
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-10 lg:grid-cols-2 lg:pt-20">
        <div>
          <motion.span
            {...fadeUp}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-content-secondary"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Now live on the Arc network
          </motion.span>

          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl"
          >
            The stock market
            <br />
            for <span className="text-gradient">football players</span>
          </motion.h1>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-5 max-w-md text-lg text-content-secondary"
          >
            Trade shares of real players like stocks. Prices move with form,
            transfers and demand — with leveraged futures, live charts and on-chain
            settlement in USDC on Arc.
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/dashboard"
              className="btn-base h-12 bg-primary px-6 text-base text-white shadow-lg shadow-primary/30 hover:bg-primary/90"
            >
              Start trading free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/market"
              className="btn-base h-12 border border-white/15 px-6 text-base backdrop-blur hover:bg-white/5"
            >
              Explore the market
            </Link>
          </motion.div>

          {/* stats */}
          <motion.dl
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="mt-10 grid max-w-md grid-cols-4 gap-4"
          >
            {STATS.map((s) => (
              <div key={s.label}>
                <dt className="font-display text-2xl font-bold tabular-nums">{s.value}</dt>
                <dd className="text-[11px] leading-tight text-content-secondary">{s.label}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <HeroPreview />
      </section>

      {/* live ticker */}
      <LandingTicker />

      {/* features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <h2 className="font-display text-3xl font-bold tracking-tight">
            A trading desk for the beautiful game
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-content-secondary">
            Everything you'd expect from a modern exchange — tuned for football.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className={`glass group rounded-2xl p-6 transition-all hover:-translate-y-1 ${f.ring}`}
            >
              <div className="inline-flex rounded-xl bg-white/5 p-2.5 ring-1 ring-white/5">
                {f.icon}
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-content-secondary">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 p-10 text-center"
        >
          <div className="absolute -left-20 -top-20 -z-10 h-72 w-72 rounded-full bg-primary/25 blur-[120px]" />
          <div className="absolute -bottom-24 -right-10 -z-10 h-72 w-72 rounded-full bg-emerald-500/20 blur-[120px]" />
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Build the perfect <span className="text-gradient">football portfolio</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-content-secondary">
            No deposit required. Start with £10,000 virtual, learn the market, and go
            on-chain when you're ready.
          </p>
          <Link
            href="/dashboard"
            className="btn-base mx-auto mt-7 h-12 w-fit bg-primary px-7 text-base text-white shadow-lg shadow-primary/30 hover:bg-primary/90"
          >
            Launch the app <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-xs text-content-secondary">
        soka — the stock market for football players. Testnet platform · settles in USDC on Arc · not investment advice.
      </footer>
    </div>
  );
}
