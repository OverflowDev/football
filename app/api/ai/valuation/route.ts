import { NextRequest } from "next/server";
import { z } from "zod";
import { streamAI } from "@/lib/openai";
import { valuationContext } from "@/lib/ai-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  messages: z.array(
    z.object({ role: z.enum(["user", "assistant"]), content: z.string() })
  ),
});

const SYSTEM = `You are a quantitative analyst specializing in football player valuation for the FPI trading platform. Calculate fair value using performance metrics, age curve, contract length, club stature, international status, and transfer-market comparables.

For any player asked about, return: Current Price | Fair Value | Upside % | Verdict (Undervalued/Fair Value/Overvalued) | Key valuation factors. Ground every number in the injected data below.`;

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Invalid request", { status: 400 });

  const system = `${SYSTEM}\n\n=== PLAYER VALUATION DATA ===\n${await valuationContext()}`;

  const fallback =
    "Valuation breakdown (from the FPI model):\n\n" +
    "• Fair value is derived as BaseValue × (1 + (Form + Rumor − InjuryPenalty)/100).\n" +
    "• Players trading >8% below fair value screen as Undervalued; >8% above as Overvalued.\n" +
    "• Name a specific player and I'll return Current Price | Fair Value | Upside % | Verdict | Key factors.\n\n" +
    "(Connect an OPENAI_API_KEY for live valuations.)";

  const stream = streamAI({ system, messages: parsed.data.messages, maxTokens: 1024, fallback });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
