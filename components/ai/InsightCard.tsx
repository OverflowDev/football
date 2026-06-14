"use client";

import { Sparkles, TrendingUp, ShieldAlert, Target } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PriceTag } from "@/components/shared/PriceTag";
import {
  RecommendationBadge,
  RiskBadge,
  VerdictBadge,
} from "@/components/ai/PredictionBadge";
import { formatCurrency } from "@/lib/utils";
import type { AIInsight } from "@/types";

/** Full AI analysis card. */
export function InsightCard({ insight }: { insight: AIInsight }) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold">AI Analysis</h3>
          </div>
          <RecommendationBadge rec={insight.recommendation} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric
            icon={<Target className="h-4 w-4 text-primary" />}
            label="Fair Value"
            value={formatCurrency(insight.fairValue)}
            extra={<VerdictBadge verdict={insight.verdict} />}
          />
          <Metric
            icon={<TrendingUp className="h-4 w-4 text-up" />}
            label="Upside"
            value=""
            extra={<PriceTag value={insight.upsidePercent} />}
          />
          <Metric
            icon={<TrendingUp className="h-4 w-4 text-content-secondary" />}
            label="Transfer Prob."
            value={`${insight.transferProbability}%`}
          />
          <Metric
            icon={<ShieldAlert className="h-4 w-4 text-gold" />}
            label="Risk"
            value=""
            extra={<RiskBadge risk={insight.riskRating} />}
          />
        </div>

        <p className="mt-4 text-sm leading-relaxed text-content-secondary">{insight.summary}</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-up">Key Factors</p>
            <ul className="space-y-1 text-sm text-content-secondary">
              {insight.keyFactors.map((f, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-up">+</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-down">Risk Factors</p>
            <ul className="space-y-1 text-sm text-content-secondary">
              {insight.riskFactors.map((f, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-down">−</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-surface/60 px-3 py-2 text-xs">
          <span className="text-content-secondary">Form trend: <span className="text-content">{insight.formTrend}</span></span>
          <span className="text-content-secondary">Confidence: <span className="text-content">{insight.confidence}</span></span>
        </div>
      </div>
    </Card>
  );
}

function Metric({
  icon,
  label,
  value,
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-surface/60 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-content-secondary">
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-center gap-2">
        {value && <span className="font-mono text-sm font-semibold">{value}</span>}
        {extra}
      </div>
    </div>
  );
}
