import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiSummarize } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { LANG_MAP, type LanguageCode } from "@/lib/constants";
import { toast } from "sonner";

type Length = "quick" | "medium" | "detailed";
const LABEL: Record<Length, { title: string; sub: string }> = {
  quick: { title: "Quick", sub: "≈ 1 min" },
  medium: { title: "Medium", sub: "≈ 5 min" },
  detailed: { title: "Detailed", sub: "in-depth" },
};

export function SummaryPanel({ postId, language }: { postId: string; language: LanguageCode }) {
  const [length, setLength] = useState<Length>("quick");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const summarize = useServerFn(aiSummarize);

  async function load(L: Length) {
    setLength(L);
    setLoading(true);
    setContent("");
    try {
      const res = await summarize({ data: { postId, language, length: L } });
      setContent(res.content);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not summarize");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // auto-load quick summary on open / when language changes
    load("quick");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, language]);

  const dir = LANG_MAP[language].rtl ? "rtl" : "ltr";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-primary" /> AI Summary
      </div>
      <div className="flex gap-2 px-4 pt-3">
        {(Object.keys(LABEL) as Length[]).map((L) => (
          <button
            key={L}
            onClick={() => load(L)}
            className={
              "flex-1 rounded-xl border px-3 py-2 text-left transition " +
              (length === L
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card hover:bg-secondary")
            }
          >
            <div className="text-sm font-semibold">{LABEL[L].title}</div>
            <div className="text-xs text-muted-foreground">{LABEL[L].sub}</div>
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4" dir={dir}>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Generating summary…
          </div>
        )}
        {!loading && content && (
          <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{content}</div>
        )}
        {!loading && !content && (
          <div className="text-sm text-muted-foreground">No summary yet.</div>
        )}
      </div>
      {!loading && content && (
        <div className="border-t border-border px-4 py-2 text-right">
          <Button size="sm" variant="ghost" onClick={() => load(length)}>
            Regenerate
          </Button>
        </div>
      )}
    </div>
  );
}