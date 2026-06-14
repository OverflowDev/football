"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, Square, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PlayerAvatar } from "@/components/shared/PlayerAvatar";
import { useAIAgent } from "@/hooks/useAIAgent";
import { cn } from "@/lib/utils";
import type { AgentType } from "@/types";

export function AgentChat({
  agent,
  title,
  accent,
  greeting,
  suggestions = [],
  context,
}: {
  agent: AgentType;
  title: string;
  accent: string;
  greeting: string;
  suggestions?: string[];
  context?: Record<string, unknown>;
}) {
  const { messages, send, stop, reset, isStreaming, error } = useAIAgent(agent);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || isStreaming) return;
    setInput("");
    send(value, context);
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col card-surface bg-card">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex rounded-lg p-1.5", accent)}>
            <Sparkles className="h-4 w-4" />
          </span>
          <h2 className="font-display font-semibold">{title}</h2>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-content-secondary hover:bg-white/5"
        >
          <RotateCcw className="h-3.5 w-3.5" /> New chat
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className={cn("mb-3 inline-flex rounded-xl p-3", accent)}>
              <Sparkles className="h-6 w-6" />
            </span>
            <p className="max-w-sm text-sm text-content-secondary">{greeting}</p>
            {suggestions.length > 0 && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-content-secondary hover:border-primary/40 hover:text-content"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}
          >
            {m.role === "assistant" ? (
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", accent)}>
                <Sparkles className="h-4 w-4" />
              </span>
            ) : (
              <PlayerAvatar name="You" size="sm" />
            )}
            <div
              className={cn(
                "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                m.role === "user"
                  ? "bg-primary text-white"
                  : "bg-surface text-content"
              )}
            >
              {m.content || (isStreaming && i === messages.length - 1 ? "▊" : "")}
            </div>
          </motion.div>
        ))}

        {error && <p className="text-center text-xs text-down">{error}</p>}
      </div>

      <div className="border-t border-white/5 p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            rows={1}
            placeholder="Ask the agent…"
            className="max-h-32 flex-1 resize-none rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-content placeholder:text-content-secondary/60 focus:border-primary/50 focus:outline-none"
          />
          {isStreaming ? (
            <Button variant="secondary" size="md" onClick={stop}>
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="md" onClick={() => submit(input)} disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
