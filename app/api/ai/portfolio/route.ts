import { NextRequest } from "next/server";
import { z } from "zod";
import { streamAI } from "@/lib/openai";
import { getCurrentUser } from "@/lib/session";
import { fetchPortfolio } from "@/lib/data";
import { marketSummary } from "@/lib/ai-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  messages: z.array(
    z.object({ role: z.enum(["user", "assistant"]), content: z.string() })
  ),
});

const SYSTEM = `You are a personal portfolio manager on the FPI trading platform. The user's live portfolio, cash balance, and market conditions are injected below. Analyze risk concentration, best/worst performers, and rebalancing opportunities. Speak directly to the user ("you"). Be specific and reference their actual holdings — never generic.`;

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Invalid request", { status: 400 });

  const user = await getCurrentUser();
  const portfolio = await fetchPortfolio(user.id);

  const holdingsStr = portfolio.holdings.length
    ? portfolio.holdings
        .map(
          (h) =>
            `${h.player.name} (${h.player.symbol}): ${h.shares} shares, avg £${h.averageBuyPrice.toFixed(
              2
            )}, now £${h.player.currentPrice.toFixed(2)}, value £${h.currentValue.toFixed(
              2
            )}, P&L ${h.pnlPercent.toFixed(1)}%`
        )
        .join("\n")
    : "No holdings yet.";

  const system = `${SYSTEM}\n\n=== YOUR PORTFOLIO ===\nTotal value: £${portfolio.totalValue.toFixed(
    2
  )}\nCash balance: £${portfolio.cashBalance.toFixed(2)}\nTotal P&L: £${portfolio.totalPnl.toFixed(
    2
  )} (${portfolio.totalPnlPercent.toFixed(1)}%)\nHoldings:\n${holdingsStr}\n\n=== MARKET ===\n${marketSummary()}`;

  const fallback =
    `Here's a quick read on your portfolio (total value £${portfolio.totalValue.toFixed(
      2
    )}, P&L ${portfolio.totalPnlPercent.toFixed(1)}%):\n\n` +
    (portfolio.bestPerformer
      ? `• Best performer: ${portfolio.bestPerformer.player.name} (${portfolio.bestPerformer.pnlPercent.toFixed(
          1
        )}%).\n`
      : "") +
    (portfolio.worstPerformer
      ? `• Worst performer: ${portfolio.worstPerformer.player.name} (${portfolio.worstPerformer.pnlPercent.toFixed(
          1
        )}%) — review the thesis.\n`
      : "") +
    `• You hold ${portfolio.holdingsCount} players with £${portfolio.cashBalance.toFixed(
      2
    )} cash to deploy.\n\n(Connect an OPENAI_API_KEY for live, fully-reasoned portfolio analysis.)`;

  const stream = streamAI({ system, messages: parsed.data.messages, maxTokens: 1024, fallback });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
