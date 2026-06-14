import { Badge } from "@/components/ui/Badge";

const VERDICT_VARIANT = {
  Undervalued: "up",
  "Fair Value": "neutral",
  Overvalued: "down",
} as const;

const REC_VARIANT = {
  "STRONG BUY": "up",
  BUY: "up",
  HOLD: "gold",
  SELL: "down",
} as const;

const RISK_VARIANT = {
  Low: "up",
  Medium: "gold",
  High: "down",
} as const;

export function VerdictBadge({ verdict }: { verdict: keyof typeof VERDICT_VARIANT }) {
  return <Badge variant={VERDICT_VARIANT[verdict]}>{verdict}</Badge>;
}

export function RecommendationBadge({ rec }: { rec: keyof typeof REC_VARIANT }) {
  return <Badge variant={REC_VARIANT[rec]}>{rec}</Badge>;
}

export function RiskBadge({ risk }: { risk: keyof typeof RISK_VARIANT }) {
  return <Badge variant={RISK_VARIANT[risk]}>{risk} Risk</Badge>;
}
