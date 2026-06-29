"use client";

// ============================================================================
//  MasterAnalytics Pro — AI Chatbot Widget (floating)
//  A floating chat button that opens a conversational panel about the user's
//  campaign data. Sends messages to /api/chat with the current dashboard
//  filters as context.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Send,
  X,
  Loader2,
  MessageSquare,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatWidgetProps {
  campaign?: string;
  tehsil?: string;
  uc?: string;
  day?: string;
  /** Display name used in the greeting (e.g. derived from email). */
  userName?: string;
}

// ---------------------------------------------------------------------------
//  Suggested prompts shown when the chat is first opened
// ---------------------------------------------------------------------------

const SUGGESTED_PROMPTS = [
  "What's the overall coverage percentage?",
  "Which UCs have the lowest coverage?",
  "Where are the most refusals?",
  "Summarize the campaign performance.",
];

// ===========================================================================
//  Component
// ===========================================================================

export function ChatWidget({
  campaign,
  tehsil,
  uc,
  day = "all",
  userName,
}: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Derive a friendly first name from the email-like userName
  const firstName = useMemo(() => {
    if (!userName) return "";
    const base = userName.includes("@") ? userName.split("@")[0] : userName;
    const cleaned = base.replace(/[._-]+/g, " ").trim();
    if (!cleaned) return "";
    return cleaned
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }, [userName]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus the input when the panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // ---- Send a message to /api/chat ----
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = { role: "user", content: trimmed };
      const newHistory = [...messages, userMsg];
      setMessages(newHistory);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history: newHistory.map((m) => ({ role: m.role, content: m.content })),
            campaign,
            tehsil,
            uc,
            day,
          }),
        });

        const data = (await res.json().catch(() => null)) as
          | { reply?: string; error?: string }
          | null;

        if (!res.ok || !data) {
          const msg = data?.error || `Request failed (HTTP ${res.status}).`;
          throw new Error(msg);
        }

        if (data.error) {
          throw new Error(data.error);
        }

        const reply = data.reply || "I couldn't generate a response.";
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error.";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ Sorry, I encountered an error: ${msg}`,
          },
        ]);
        toast.error("Chat failed", { description: msg });
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, campaign, tehsil, uc, day]
  );

  // ---- Handle Enter (send) vs Shift+Enter (newline) ----
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void sendMessage(input);
      }
    },
    [input, sendMessage]
  );

  // ---- Clear conversation ----
  const handleClear = useCallback(() => {
    setMessages([]);
  }, []);

  // ===========================================================================
  //  Render
  // ===========================================================================

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open AI chat"}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all",
          open
            ? "bg-slate-700 text-white hover:bg-slate-800"
            : "bg-gradient-to-br from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600 hover:shadow-xl"
        )}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <Bot className="h-6 w-6" />
        )}
        {!open && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-cyan-500" />
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[32rem] w-[calc(100vw-3rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">AI Data Assistant</p>
                <p className="text-[11px] text-blue-100">
                  {campaign ? `Campaign: ${campaign}` : "Ask about your data"}
                </p>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="rounded-md px-2 py-1 text-xs text-blue-100 transition-colors hover:bg-white/20 hover:text-white"
              title="Clear conversation"
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4"
          >
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {firstName
                      ? `Hello! ${firstName}`
                      : "Hello!"}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-blue-600">
                    {"I'm Master!"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    How can I help you? Ask me about your campaign data —
                    coverage, refusals, missed children, and more.
                  </p>
                </div>
                {!campaign && (
                  <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Select a campaign on the dashboard for data context.
                  </p>
                )}
                {/* Suggested prompts */}
                <div className="flex w-full flex-col gap-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => void sendMessage(prompt)}
                      disabled={loading}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))
            )}

            {/* Loading indicator */}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span>Analyzing data…</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your data…"
                rows={1}
                className="max-h-24 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <Button
                onClick={() => void sendMessage(input)}
                disabled={!input.trim() || loading}
                size="icon"
                className="h-9 w-9 shrink-0 bg-gradient-to-br from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400">
              Press Enter to send • Shift+Enter for newline
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
//  Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
          isUser
            ? "rounded-br-md bg-gradient-to-br from-blue-600 to-cyan-500 text-white"
            : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
        )}
      >
        {/* Render simple **bold** markdown */}
        {message.content.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={i} className="font-semibold">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
    </div>
  );
}
