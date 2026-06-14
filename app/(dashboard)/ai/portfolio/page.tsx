"use client";

import { AgentChat } from "@/components/ai/AgentChat";

export default function PortfolioAgentPage() {
  return (
    <AgentChat
      agent="PORTFOLIO"
      title="Portfolio Agent"
      accent="text-gold bg-gold/10"
      greeting="I analyse your live holdings for risk, concentration and rebalancing. Ask me about your portfolio."
      suggestions={[
        "Is my portfolio too risky?",
        "What should I sell?",
        "How concentrated am I?",
        "Where should I deploy my cash?",
      ]}
    />
  );
}
