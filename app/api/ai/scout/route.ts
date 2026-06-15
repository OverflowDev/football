import { NextRequest } from "next/server";
import { z } from "zod";
import { streamAI } from "@/lib/openai";
import { scoutContext, marketSummary } from "@/lib/ai-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  messages: z.array(
    z.object({ role: z.enum(["user", "assistant"]), content: z.string() })
  ),
});

const SYSTEM = `You are an elite football scout and investment analyst on the FPI (Football Performance Index) trading platform. You have access to current player prices, modelled fair values, recent form, transfer rumor scores, and demand data (injected below).

When recommending players, always return a structured response per player:
1. Player name and current price
2. Fair value estimate
3. Upside potential (%)
4. Confidence level (High/Medium/Low)
5. Key reasons (3 bullet points)
6. Risk factors
7. Recommended action: STRONG BUY / BUY / HOLD / SELL

Base ALL recommendations strictly on the injected data below, not general knowledge. Be concise and specific.`;

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return new Response("Invalid request", { status: 400 });
  }

  const system = `${SYSTEM}\n\n=== MARKET SUMMARY ===\n${await marketSummary()}\n\n=== SCREENED PLAYERS (sorted by upside) ===\n${await scoutContext()}`;

  const fallback =
    "Based on the current screen, the strongest value candidates are the players trading furthest below their modelled fair value with rising form. Top picks:\n\n" +
    "1. The highest-upside name on the board screens as a STRONG BUY — meaningfully below fair value with strong recent output and no injury flag.\n" +
    "2. A mid-price midfielder with rising form and low transfer risk rates a BUY.\n" +
    "3. Avoid names trading above fair value or carrying injury flags.\n\n" +
    "(Connect an OPENAI_API_KEY for live, fully-reasoned recommendations.)";

  const stream = streamAI({
    system,
    messages: parsed.data.messages,
    maxTokens: 1024,
    fallback,
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
