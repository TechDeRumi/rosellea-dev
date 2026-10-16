import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getBookAnalysis } from "@/lib/books.functions";
import { Loader2, Layers, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { LANG_MAP, type LanguageCode } from "@/lib/constants";

export function FlashcardsPanel({ postId, language }: { postId: string; language: LanguageCode }) {
  const load = useServerFn(getBookAnalysis);
  const [cards, setCards] = useState<{ id: string; question: string; answer: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("pending");
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    load({ data: { postId } })
      .then((r) => {
        if (!alive) return;
        setCards(r.flashcards as { id: string; question: string; answer: string }[]);
        setStatus(r.status);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [postId, load]);

  const dir = LANG_MAP[language].rtl ? "rtl" : "ltr";
  const card = cards[i];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
        <Layers className="h-4 w-4 text-primary" /> Flashcards
        {cards.length > 0 && (
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {i + 1} / {cards.length}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6" dir={dir}>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading flashcards…
          </div>
        )}
        {!loading && cards.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
            {status === "ready"
              ? "No flashcards were generated for this book."
              : status === "analyzing"
                ? "AI is still analyzing this book — check back in a minute."
                : "This book hasn't been analyzed yet."}
          </div>
        )}
        {!loading && card && (
          <div className="space-y-4">
            <button
              onClick={() => setFlipped((f) => !f)}
              className="flex min-h-[240px] w-full flex-col items-center justify-center rounded-3xl border border-border bg-card p-6 text-center shadow-sm transition hover:border-primary/40"
            >
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-primary">
                {flipped ? "Answer" : "Question"} · tap to flip
              </div>
              <div className="text-base font-medium leading-relaxed">
                {flipped ? card.answer : card.question}
              </div>
            </button>
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setI((n) => Math.max(0, n - 1));
                  setFlipped(false);
                }}
                disabled={i === 0}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button
                onClick={() => {
                  setI(0);
                  setFlipped(false);
                }}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restart
              </button>
              <button
                onClick={() => {
                  setI((n) => Math.min(cards.length - 1, n + 1));
                  setFlipped(false);
                }}
                disabled={i >= cards.length - 1}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs disabled:opacity-40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}