import OpenAI from "openai";
import { OPENAI_MODEL, hasOpenAI } from "@/lib/config";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI | null {
  if (!hasOpenAI) return null;
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export { OPENAI_MODEL };

type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * Stream an OpenAI chat completion as a web ReadableStream of UTF-8 text
 * chunks. Falls back to a canned demo stream when no API key is configured so
 * the AI chat UI works zero-config.
 */
export function streamAI(opts: {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
  fallback: string;
}): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const openai = getOpenAI();

  if (!openai) {
    // Demo fallback — emit the canned text in small chunks to simulate streaming.
    return new ReadableStream({
      async start(controller) {
        const words = opts.fallback.split(" ");
        for (const w of words) {
          controller.enqueue(encoder.encode(w + " "));
          await new Promise((r) => setTimeout(r, 12));
        }
        controller.close();
      },
    });
  }

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          max_tokens: opts.maxTokens ?? 1024,
          stream: true,
          messages: [
            { role: "system", content: opts.system },
            ...opts.messages,
          ],
        });
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) controller.enqueue(encoder.encode(delta));
        }
        controller.close();
      } catch {
        controller.enqueue(
          encoder.encode("\n\n[AI service error — please try again shortly.]")
        );
        controller.close();
      }
    },
  });
}

/**
 * Non-streaming JSON completion with strict parsing (OpenAI JSON mode).
 * Returns `fallback` when no API key is set or parsing fails (never throws).
 */
export async function completeJSON<T>(opts: {
  system: string;
  user: string;
  fallback: T;
  maxTokens?: number;
}): Promise<T> {
  const openai = getOpenAI();
  if (!openai) return opts.fallback;
  try {
    const res = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: opts.maxTokens ?? 1024,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            opts.system +
            "\n\nRespond with ONLY valid minified JSON. No prose, no markdown fences.",
        },
        { role: "user", content: opts.user },
      ],
    });
    const text = res.choices[0]?.message?.content ?? "";
    const jsonStr = text.trim().replace(/^```json\s*|\s*```$/g, "");
    return JSON.parse(jsonStr) as T;
  } catch {
    return opts.fallback;
  }
}
