"use client";

import { AgentChat } from "@/components/ai/AgentChat";

export default function NewsAgentPage() {
  return (
    <AgentChat
      agent="NEWS"
      title="News Agent"
      accent="text-rose-400 bg-rose-500/10"
      greeting="I turn today's football news into a market briefing — affected players, predicted price impact and confidence."
      suggestions={[
        "Give me today's briefing",
        "Any transfer news moving prices?",
        "Which injuries should I worry about?",
        "Bullish stories right now?",
      ]}
    />
  );
}
