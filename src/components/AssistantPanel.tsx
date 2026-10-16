import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Send, Trash2 } from "lucide-react";
import { LANG_MAP, type LanguageCode } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { loadAssistantMessages, clearAssistantMessages } from "@/lib/ai.functions";
import { toast } from "sonner";

type Msg = { id?: string; role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Summarize this for me",
  "Explain in simple words",
  "Give important points",
  "What are the author's main arguments?",
  "Create study notes",
  "Give real-world examples",
  "Explain like a teacher",
  "Explain difficult vocabulary",
];

export function AssistantPanel({ postId, language }: { postId: string; language: LanguageCode }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const load = useServerFn(loadAssistantMessages);
  const clear = useServerFn(clearAssistantMessages);

  useEffect(() => {
    load({ data: { postId } })
      .then((rows) =>
        setMessages(
          (rows as { id: string; role: "user" | "assistant"; content: string }[]).map((r) => ({
            id: r.id,
            role: r.role,
            content: r.content,
          })),
        ),
      )
      .catch(() => {});
  }, [postId, load]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || streaming) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message }, { role: "assistant", content: "" }]);
    setStreaming(true);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      toast.error("Sign in to use the AI assistant");
      setStreaming(false);
      return;
    }
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          postId,
          language,
          message,
          history: messages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok || !res.body) {
        const t = await res.text();
        throw new Error(t || `Error ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = prev.slice();
          next[next.length - 1] = { role: "assistant", content: full };
          return next;
        });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Assistant failed");
      setMessages((prev) => prev.slice(0, -1)); // drop empty assistant bubble
    } finally {
      setStreaming(false);
    }
  }

  async function onClear() {
    setMessages([]);
    try {
      await clear({ data: { postId } });
    } catch {
      /* ignore */
    }
  }

  const dir = LANG_MAP[language].rtl ? "rtl" : "ltr";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-primary" /> Ask about this
        <button
          onClick={onClear}
          className="ml-auto inline-flex items-center gap-1 text-xs font-normal text-muted-foreground hover:text-foreground"
          title="Clear conversation"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear
        </button>
      </div>

      <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" dir={dir}>
        {messages.length === 0 && (
          <div>
            <p className="text-sm text-muted-foreground">
              Ask anything about this content — I'll answer using its text in your reading language.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-secondary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              "rounded-2xl px-3 py-2 text-[15px] leading-relaxed " +
              (m.role === "user"
                ? "ml-auto max-w-[85%] bg-primary text-primary-foreground"
                : "max-w-[95%] border border-border bg-card text-foreground")
            }
          >
            {m.content || (
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> thinking…
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask anything…"
            rows={1}
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || streaming}>
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}