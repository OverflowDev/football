"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Calculator, Briefcase, Newspaper, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { AgentType } from "@/types";

export interface AgentMeta {
  type: AgentType;
  name: string;
  tagline: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accent: string;
}

export const AGENTS: AgentMeta[] = [
  {
    type: "SCOUT",
    name: "Scout Agent",
    tagline: "Find undervalued players",
    description:
      "Scans form, news sentiment and price vs fair value to surface buy candidates. Ask: \"Who should I buy under £50?\"",
    href: "/ai/scout",
    icon: Search,
    accent: "text-emerald-400 bg-emerald-500/10",
  },
  {
    type: "VALUATION",
    name: "Valuation Agent",
    tagline: "What's it really worth?",
    description:
      "Quantitative fair-value model across performance, age curve, contract and comparables. Returns upside %.",
    href: "/ai/valuation",
    icon: Calculator,
    accent: "text-primary bg-primary/10",
  },
  {
    type: "PORTFOLIO",
    name: "Portfolio Agent",
    tagline: "Optimise your holdings",
    description:
      "Analyses your portfolio for risk concentration and rebalancing. Ask: \"Is my portfolio too risky?\"",
    href: "/ai/portfolio",
    icon: Briefcase,
    accent: "text-gold bg-gold/10",
  },
  {
    type: "NEWS",
    name: "News Agent",
    tagline: "Daily market briefing",
    description:
      "Maps today's football news to affected players with predicted price impact and confidence scores.",
    href: "/ai/news",
    icon: Newspaper,
    accent: "text-rose-400 bg-rose-500/10",
  },
];

export function AgentSelector() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {AGENTS.map((agent) => {
        const Icon = agent.icon;
        return (
          <motion.div key={agent.type} whileHover={{ y: -3 }}>
            <Link href={agent.href}>
              <Card className="h-full p-5 transition-colors hover:border-primary/30">
                <div className={`inline-flex rounded-lg p-2.5 ${agent.accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold">{agent.name}</h3>
                <p className="text-sm font-medium text-content-secondary">{agent.tagline}</p>
                <p className="mt-2 text-sm leading-relaxed text-content-secondary">
                  {agent.description}
                </p>
                <p className="mt-4 text-sm font-medium text-primary">Open chat →</p>
              </Card>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
