import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiKnowledgeTimeline, type KnowledgePayload } from "@/lib/ai.functions";
import { Loader2, Network, Users, Sparkles, BookOpen, Compass } from "lucide-react";
import { LANG_MAP, type LanguageCode } from "@/lib/constants";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export function KnowledgeTimelinePanel({ postId, language }: { postId: string; language: LanguageCode }) {
  const run = useServerFn(aiKnowledgeTimeline);
  const [payload, setPayload] = useState<KnowledgePayload | null>(null);
  const [recommended, setRecommended] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    run({ data: { postId, language } })
      .then((r) => {
        if (!alive) return;
        setPayload(r.payload);
        setRecommended(r.recommended ?? []);
      })
      .catch((e) => toast.error(e?.message ?? "Could not build knowledge timeline"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [postId, language, run]);

  const dir = LANG_MAP[language].rtl ? "rtl" : "ltr";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
        <Network className="h-4 w-4 text-primary" /> Knowledge Timeline
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4" dir={dir}>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Building connected knowledge…
          </div>
        )}
        {!loading && payload && (
          <div className="space-y-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Topic</div>
              <div className="mt-1 text-lg font-semibold leading-snug">{payload.topic}</div>
              {payload.overview && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{payload.overview}</p>
              )}
            </div>

            {payload.events?.length > 0 && (
              <Section icon={<Sparkles className="h-4 w-4" />} title="Timeline">
                <ol className="space-y-3 border-l-2 border-primary/30 pl-4">
                  {payload.events.map((e, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                      <div className="text-xs font-semibold text-primary">{e.year}</div>
                      <div className="text-sm font-medium text-foreground">{e.title}</div>
                      <div className="text-sm text-muted-foreground">{e.description}</div>
                    </li>
                  ))}
                </ol>
              </Section>
            )}

            {payload.people?.length > 0 && (
              <Section icon={<Users className="h-4 w-4" />} title="Key figures">
                <ul className="space-y-2">
                  {payload.people.map((p, i) => (
                    <li key={i} className="rounded-xl border border-border bg-card p-3">
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.role}</div>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {payload.relatedConcepts?.length > 0 && (
              <Section icon={<Compass className="h-4 w-4" />} title="Related concepts">
                <div className="flex flex-wrap gap-2">
                  {payload.relatedConcepts.map((c, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-border bg-card px-3 py-1 text-xs"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {recommended.length > 0 && (
              <Section icon={<BookOpen className="h-4 w-4" />} title="From Rosellea">
                <ul className="space-y-1.5">
                  {recommended.map((r) => (
                    <li key={r.id}>
                      <Link
                        to="/post/$id"
                        params={{ id: r.id }}
                        className="block rounded-lg px-2 py-1.5 text-sm hover:bg-secondary"
                      >
                        {r.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {payload.exploreFurther?.length > 0 && (
              <Section icon={<Compass className="h-4 w-4" />} title="Explore further">
                <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                  {payload.exploreFurther.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        )}
        {!loading && !payload && (
          <div className="text-sm text-muted-foreground">Nothing to show.</div>
        )}
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}