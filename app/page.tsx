"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  TrendingUp,
  Sparkles,
  Coins,
  ArrowRight,
  ShieldCheck,
  Bot,
  LineChart,
} from "lucide-react";
import { AuroraBackground } from "@/components/landing/AuroraBackground";
import { HeroPreview } from "@/components/landing/HeroPreview";
import { LandingTicker } from "@/components/landing/LandingTicker";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const FEATURES = [
  {
    icon: <TrendingUp className="h-5 w-5 text-up" />,
    title: "Dynamic FPI pricing",
    body: "Prices recompute from form, transfer rumors and a live bonding curve — every buy and sell moves the market in real time.",
    ring: "hover:border-up/30",
  },
  {
    icon: <Bot className="h-5 w-5 text-primary" />,
    title: "Four AI agents",
    body: "Scout, Valuation, Portfolio and News agents stream grounded, data-backed analysis from OpenAI on demand.",
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
    title: "Risk-free to start",
    body: "Begin with £10,000 virtual. Climb the leaderboard, then go on-chain when you're ready.",
    ring: "hover:border-sky-400/30",
  },
  {
    icon: <Sparkles className="h-5 w-5 text-fuchsia-400" />,
    title: "Daily AI briefing",
    body: "Wake up to a market summary that maps the night's football news to price moves across your watchlist.",
    ring: "hover:border-fuchsia-400/30",
  },
];

const STATS = [
  { value: "50+", label: "Tradable players" },
  { value: "4", label: "AI agents" },
  { value: "0.5%", label: "Trading fee" },
  { value: "£10k", label: "Starting balance" },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AuroraBackground />

      {/* nav */}
      <header className="sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/30">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">FPI</span>
          </div>
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
            transfers and demand — backed by AI scouting, live charts and on-chain
            settlement in USDC.
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
        FPI — Football Performance Index. Demo platform · virtual currency · not investment advice.
      </footer>
    </div>
  );
}
