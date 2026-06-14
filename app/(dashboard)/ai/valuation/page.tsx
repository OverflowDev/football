"use client";

import { AgentChat } from "@/components/ai/AgentChat";

export default function ValuationAgentPage() {
  return (
    <AgentChat
      agent="VALUATION"
      title="Valuation Agent"
      accent="text-primary bg-primary/10"
      greeting="Ask me what any player is really worth. I return current price, fair value, upside % and the key drivers."
      suggestions={[
        "What's Lamine Yamal's fair value?",
        "Is Haaland overvalued?",
        "Value Bellingham vs Musiala",
        "Most overvalued player on the board?",
      ]}
    />
  );
}
