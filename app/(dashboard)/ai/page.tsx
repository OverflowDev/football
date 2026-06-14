import { Sparkles } from "lucide-react";
import { AgentSelector } from "@/components/ai/AgentSelector";

export const metadata = { title: "AI Agents · FPI" };

export default function AIHubPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex rounded-xl bg-primary/15 p-2.5">
          <Sparkles className="h-5 w-5 text-primary" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold">AI Agents</h1>
          <p className="text-sm text-content-secondary">
            Four specialist analysts, grounded in live FPI market data
          </p>
        </div>
      </div>

      <AgentSelector />

      <div className="card-surface bg-card p-5 text-sm text-content-secondary">
        <p>
          Agents stream responses from OpenAI (<code className="text-content">gpt-4o</code>),
          injecting current prices, fair values, form and news into every prompt. Set{" "}
          <code className="text-content">OPENAI_API_KEY</code> to enable live reasoning — otherwise a
          grounded demo response is streamed.
        </p>
      </div>
    </div>
  );
}
