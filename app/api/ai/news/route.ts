import { NextRequest } from "next/server";
import { z } from "zod";
import { streamAI } from "@/lib/openai";
import { newsContext } from "@/lib/ai-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  messages: z.array(
    z.object({ role: z.enum(["user", "assistant"]), content: z.string() })
  ),
});

const SYSTEM = `You are a football journalist and market analyst for the FPI trading platform. Today's football news is injected below. For each story, identify affected players, predict price impact (+/- X%), and give a confidence score. Format as a clear daily briefing with actionable buy/sell implications. Ground everything in the injected stories.`;

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Invalid request", { status: 400 });

  const system = `${SYSTEM}\n\n=== TODAY'S FOOTBALL NEWS ===\n${await newsContext()}`;

  const fallback =
    "📰 FPI Daily Briefing\n\n" +
    "Today's stories and their market implications:\n\n" +
    "• Strong individual performances are pushing several forwards higher — momentum buys.\n" +
    "• Transfer rumors are inflating a handful of names; treat rumor-driven spikes with caution.\n" +
    "• Injury flags create short-term downside — watch for oversold bounces on return.\n\n" +
    "Ask me about any story for player-by-player price impact.\n\n" +
    "(Connect an OPENAI_API_KEY for live, fully-reasoned briefings.)";

  const stream = streamAI({ system, messages: parsed.data.messages, maxTokens: 1200, fallback });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
