import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getBookAnalysis } from "@/lib/books.functions";
import { CheckCircle2, XCircle, Loader2, Brain } from "lucide-react";
import { LANG_MAP, type LanguageCode } from "@/lib/constants";

type Q = { id: string; question: string; options: string[]; correct_index: number; explanation: string };

export function QuizPanel({ postId, language }: { postId: string; language: LanguageCode }) {
  const load = useServerFn(getBookAnalysis);
  const [quiz, setQuiz] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("pending");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    setLoading(true);
    load({ data: { postId } })
      .then((r) => {
        if (!alive) return;
        setQuiz(
          (r.quizzes as unknown as Q[]).map((q) => ({
            ...q,
            options: Array.isArray(q.options) ? q.options : [],
          })),
        );
        setStatus(r.status);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [postId, load]);

  const dir = LANG_MAP[language].rtl ? "rtl" : "ltr";
  const score = quiz.reduce(
    (s, q) => s + (revealed[q.id] && answers[q.id] === q.correct_index ? 1 : 0),
    0,
  );
  const done = quiz.length > 0 && quiz.every((q) => revealed[q.id]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
        <Brain className="h-4 w-4 text-primary" /> Quiz
        {done && (
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            Score {score}/{quiz.length}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4" dir={dir}>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading quiz…
          </div>
        )}
        {!loading && quiz.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
            {status === "ready"
              ? "No quiz was generated for this book."
              : status === "analyzing"
                ? "AI is still analyzing this book."
                : "This book hasn't been analyzed yet."}
          </div>
        )}
        <div className="space-y-5">
          {quiz.map((q, qi) => {
            const picked = answers[q.id];
            const shown = revealed[q.id];
            return (
              <div key={q.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 text-sm font-medium leading-snug">
                  <span className="mr-2 text-xs font-semibold text-primary">Q{qi + 1}</span>
                  {q.question}
                </div>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => {
                    const isPicked = picked === oi;
                    const isCorrect = shown && oi === q.correct_index;
                    const isWrong = shown && isPicked && oi !== q.correct_index;
                    return (
                      <button
                        key={oi}
                        disabled={shown}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                        className={
                          "flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm transition " +
                          (isCorrect
                            ? "border-emerald-500/60 bg-emerald-500/10"
                            : isWrong
                              ? "border-red-500/60 bg-red-500/10"
                              : isPicked
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-secondary")
                        }
                      >
                        {shown && isCorrect ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        ) : shown && isWrong ? (
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        ) : (
                          <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-border text-[10px]">
                            {String.fromCharCode(65 + oi)}
                          </span>
                        )}
                        <span className="flex-1">{opt}</span>
                      </button>
                    );
                  })}
                </div>
                {!shown ? (
                  <button
                    disabled={picked === undefined}
                    onClick={() => setRevealed((r) => ({ ...r, [q.id]: true }))}
                    className="mt-3 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40"
                  >
                    Check answer
                  </button>
                ) : (
                  q.explanation && (
                    <p className="mt-3 rounded-xl bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
                      {q.explanation}
                    </p>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}