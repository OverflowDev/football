"use client";

import { AgentChat } from "@/components/ai/AgentChat";

export default function ScoutAgentPage() {
  return (
    <AgentChat
      agent="SCOUT"
      title="Scout Agent"
      accent="text-emerald-400 bg-emerald-500/10"
      greeting="I find undervalued players by scanning form, news sentiment and price vs fair value. Ask me who to buy."
      suggestions={[
        "Who should I buy under £50?",
        "Find me 3 undervalued forwards",
        "Best value midfielder right now?",
        "Any STRONG BUY signals today?",
      ]}
    />
  );
}
