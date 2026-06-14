"use client";

import { useCallback, useRef, useState } from "react";
import type { AgentType, ChatMessage } from "@/types";

const ENDPOINT: Record<AgentType, string> = {
  SCOUT: "/api/ai/scout",
  VALUATION: "/api/ai/valuation",
  PORTFOLIO: "/api/ai/portfolio",
  NEWS: "/api/ai/news",
};

/**
 * Drives a streaming chat against one of the AI agent routes.
 * Appends tokens to the last assistant message as they arrive.
 */
export function useAIAgent(agent: AgentType, initial: ChatMessage[] = []) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (content: string, context?: Record<string, unknown>) => {
      setError(null);
      const userMsg: ChatMessage = { role: "user", content };
      const history = [...messages, userMsg];
      setMessages([...history, { role: "assistant", content: "" }]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(ENDPOINT[agent], {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, context }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error("Agent request failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: acc };
            return next;
          });
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError((e as Error).message);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [agent, messages]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => setMessages([]), []);

  return { messages, send, stop, reset, isStreaming, error };
}
