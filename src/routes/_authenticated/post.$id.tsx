import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LANG_MAP, type LanguageCode } from "@/lib/constants";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, Bookmark, MessageCircle, Loader2, BookOpen, ArrowLeft, Sparkles, FileText, Headphones, Network, X, Layers, Brain, Notebook, Clock, GraduationCap, Wand2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getBookText, analyzeBook, getBookAnalysis } from "@/lib/books.functions";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { AssistantPanel } from "@/components/AssistantPanel";
import { SummaryPanel } from "@/components/SummaryPanel";
import { PodcastPlayer } from "@/components/PodcastPlayer";
import { KnowledgeTimelinePanel } from "@/components/KnowledgeTimelinePanel";
import { FlashcardsPanel } from "@/components/FlashcardsPanel";
import { QuizPanel } from "@/components/QuizPanel";
import { StudyNotesPanel } from "@/components/StudyNotesPanel";
import { PdfReader } from "@/components/PdfReader";
import { sanitizeHtml } from "@/lib/html";

export const Route = createFileRoute("/_authenticated/post/$id")({
  component: PostPage,
});

function PostPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const post = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(
          "id,title,content,type,category,cover_image_url,pdf_url,original_language,created_at,author_id,ai_status,ai_metadata,reading_minutes,difficulty,keywords,topics," +
            "author:profiles!posts_author_id_fkey(id,username,full_name,avatar_url,verified)," +
            "translations:post_translations(language,title,content)," +
            "likes(count),comments(count)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const [lang, setLang] = useState<LanguageCode | null>(null);
  useEffect(() => {
    if (post.data && !lang) setLang(post.data.original_language as LanguageCode);
  }, [post.data, lang]);

  // record reading history
  useEffect(() => {
    if (!post.data || !user) return;
    supabase
      .from("reading_history")
      .upsert({ user_id: user.id, post_id: post.data.id, last_read_at: new Date().toISOString() })
      .then(() => {});
  }, [post.data, user]);

  // Realtime: likes + comments
  useEffect(() => {
    const channel = supabase
      .channel(`post-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "likes", filter: `post_id=eq.${id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["post", id] });
          qc.invalidateQueries({ queryKey: ["like", id] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["comments", id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  const myLike = useQuery({
    queryKey: ["like", id, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("likes")
        .select("user_id")
        .eq("post_id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const myBookmark = useQuery({
    queryKey: ["bookmark", id, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookmarks")
        .select("user_id")
        .eq("post_id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in first");
      if (myLike.data) {
        await supabase.from("likes").delete().eq("post_id", id).eq("user_id", user.id);
      } else {
        await supabase.from("likes").insert({ post_id: id, user_id: user.id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["like", id, user?.id] });
      qc.invalidateQueries({ queryKey: ["post", id] });
    },
  });

  const toggleBookmark = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in first");
      if (myBookmark.data) {
        await supabase.from("bookmarks").delete().eq("post_id", id).eq("user_id", user.id);
      } else {
        await supabase.from("bookmarks").insert({ post_id: id, user_id: user.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookmark", id, user?.id] }),
  });

  const comments = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select("id,text,created_at,parent_id,user_id,user:profiles!comments_user_id_fkey(username,full_name,avatar_url,verified)")
        .eq("post_id", id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const [commentText, setCommentText] = useState("");
  const addComment = useMutation({
    mutationFn: async () => {
      if (!user || !commentText.trim()) return;
      const { error } = await supabase
        .from("comments")
        .insert({ post_id: id, user_id: user.id, text: commentText.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setCommentText("");
      qc.invalidateQueries({ queryKey: ["comments", id] });
    },
  });

  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const addReply = useMutation({
    mutationFn: async () => {
      if (!user || !replyText.trim() || !replyTo) return;
      const { error } = await supabase
        .from("comments")
        .insert({ post_id: id, user_id: user.id, text: replyText.trim(), parent_id: replyTo });
      if (error) throw error;
    },
    onSuccess: () => {
      setReplyText("");
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: ["comments", id] });
    },
  });

  const display = useMemo(() => {
    if (!post.data || !lang) return null;
    if (lang === post.data.original_language) {
      return { title: post.data.title, content: post.data.content };
    }
    const tr = (post.data.translations as any[] | null)?.find((t) => t.language === lang);
    return tr ? { title: tr.title, content: tr.content } : null;
  }, [post.data, lang]);

  // Book translation on demand (extracts PDF text + translates)
  const translateBook = useServerFn(getBookText);
  const [bookText, setBookText] = useState<{ language: LanguageCode; title: string; content: string } | null>(null);
  const [bookBusy, setBookBusy] = useState(false);
  async function loadBookText(target: LanguageCode) {
    if (!post.data) return;
    setBookBusy(true);
    try {
      const res = await translateBook({ data: { postId: post.data.id, language: target } });
      setBookText({ language: target, title: res.title, content: res.content });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not translate this book");
    } finally {
      setBookBusy(false);
    }
  }

  if (post.isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="h-8 w-2/3 animate-pulse rounded bg-secondary" />
        <div className="mt-6 h-96 animate-pulse rounded-3xl bg-secondary" />
      </div>
    );
  }
  if (!post.data) {
    return <div className="mx-auto max-w-3xl px-4 py-10">Post not found.</div>;
  }
  const p = post.data;
  const baseAvailable: LanguageCode[] = [
    p.original_language as LanguageCode,
    ...((p.translations as any[] | null)?.map((t) => t.language) ?? []),
  ];
  // For books we let readers pick any of the 5 languages — extraction & translation happen on demand.
  const available: LanguageCode[] =
    p.type === "book" ? (["en", "ur", "ps", "ar", "tr"] as LanguageCode[]) : baseAvailable;
  const dir = lang && LANG_MAP[lang].rtl ? "rtl" : "ltr";
  const isAuthor = user?.id === p.author_id;

  return (
    <div className="mx-auto max-w-3xl py-8 pl-4 pr-16 sm:pl-6 sm:pr-20 lg:px-6">
      {lang && <PostAIBar postId={p.id} language={lang} isBook={p.type === "book"} />}
      <button
        onClick={() => navigate({ to: "/home" })}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center gap-3">
        <Link to="/user/$username" params={{ username: p.author?.username ?? "" }} className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarImage src={p.author?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-secondary">
              {(p.author?.full_name || p.author?.username || "U").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="text-sm">
            <div className="flex items-center gap-1 font-medium">
              <span>{p.author?.full_name || p.author?.username}</span>
              <VerifiedBadge verified={p.author?.verified} className="h-4 w-4" />
            </div>
            <div className="text-xs text-muted-foreground">
              @{p.author?.username} · {new Date(p.created_at).toLocaleDateString()}
            </div>
          </div>
        </Link>
        <span className="ml-auto rounded-full bg-secondary px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {p.category}
        </span>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        {lang && (
          <LanguageSwitcher
            value={lang}
            available={available}
            onChange={(l) => {
              setLang(l);
              if (p.type === "book") {
                setBookText(null);
                loadBookText(l);
              }
            }}
          />
        )}
        {isAuthor && (
          <Link to="/write" search={{ edit: p.id }}>
            <Button size="sm" variant="ghost">Edit</Button>
          </Link>
        )}
      </div>

      {display ? (
        <article className="mt-8" dir={dir}>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">{display.title}</h1>
          {p.type === "book" && (
            <BookMetaBar
              postId={p.id}
              status={p.ai_status}
              readingMinutes={p.reading_minutes}
              difficulty={p.difficulty}
              keywords={p.keywords ?? []}
              isAuthor={isAuthor}
            />
          )}
          {p.cover_image_url && (
            <img src={p.cover_image_url} alt="" className="mt-6 w-full rounded-2xl border border-border object-cover" />
          )}
          {p.type === "book" && p.pdf_url && (
            <div className="mt-6 rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between gap-3 text-sm font-medium">
                <span className="inline-flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" /> Read book
                </span>
                <div className="flex items-center gap-2">
                  {lang && lang !== p.original_language && (
                    <Button size="sm" variant="outline" disabled={bookBusy} onClick={() => loadBookText(lang)}>
                      {bookBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      {bookText?.language === lang ? "Re-translate" : `Translate to ${LANG_MAP[lang].native}`}
                    </Button>
                  )}
                </div>
              </div>
              <PdfReader url={p.pdf_url} title={display.title} storageKey={p.id} />

              {bookBusy && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Extracting & translating book… this can take a minute.
                </div>
              )}
              {bookText && (
                <div className="mt-6" dir={LANG_MAP[bookText.language].rtl ? "rtl" : "ltr"}>
                  <h2 className="text-2xl font-bold">{bookText.title}</h2>
                  <div className="reading-prose mt-4 whitespace-pre-wrap text-foreground">{bookText.content}</div>
                </div>
              )}
            </div>
          )}
          {/* If content contains HTML tags (from the rich text editor), render as HTML.
              Otherwise fall back to plain text with whitespace preserved. */}
          {/<\/?[a-z][\s\S]*>/i.test(display.content) ? (
            <div
              className="article-content mt-8 text-foreground"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(display.content) }}
            />
          ) : (
            <div className="reading-prose mt-8 text-foreground">{display.content}</div>
          )}
        </article>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
          This language isn't available for this post yet.
        </div>
      )}

      {/* Engagement */}
      <div className="mt-10 flex items-center gap-2 border-t border-border pt-6">
        <Button
          variant={myLike.data ? "default" : "outline"}
          size="sm"
          onClick={() => {
            if (!user) return toast.error("Sign in to like");
            toggleLike.mutate();
          }}
        >
          <Heart className={"h-4 w-4 " + (myLike.data ? "fill-current" : "")} />
          Like
        </Button>
        <Button
          variant={myBookmark.data ? "default" : "outline"}
          size="sm"
          onClick={() => {
            if (!user) return toast.error("Sign in to bookmark");
            toggleBookmark.mutate();
          }}
        >
          <Bookmark className={"h-4 w-4 " + (myBookmark.data ? "fill-current" : "")} />
          Save
        </Button>
        <div className="ml-auto inline-flex items-center gap-1 text-sm text-muted-foreground">
          <MessageCircle className="h-4 w-4" /> {comments.data?.length ?? 0} comments
        </div>
      </div>

      {/* Comments */}
      <section className="mt-8">
        <div className="flex gap-3">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Share your thoughts…"
            className="min-h-[80px] flex-1 rounded-2xl border border-border bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            disabled={!commentText.trim() || addComment.isPending}
            onClick={() => addComment.mutate()}
          >
            {addComment.isPending && <Loader2 className="animate-spin" />} Post comment
          </Button>
        </div>

        <div className="mt-6 space-y-4">
          {(comments.data ?? [])
            .filter((c: any) => !c.parent_id)
            .reverse()
            .map((c: any) => {
              const replies = (comments.data ?? []).filter((r: any) => r.parent_id === c.id);
              return (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
                  <CommentHeader c={c} />
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{c.text}</p>
                  <div className="mt-2 flex gap-3 text-xs">
                    <button
                      onClick={() => {
                        setReplyTo(replyTo === c.id ? null : c.id);
                        setReplyText("");
                      }}
                      className="font-medium text-primary hover:underline"
                    >
                      {replyTo === c.id ? "Cancel" : "Reply"}
                    </button>
                    {replies.length > 0 && (
                      <span className="text-muted-foreground">{replies.length} {replies.length === 1 ? "reply" : "replies"}</span>
                    )}
                  </div>
                  {replyTo === c.id && (
                    <div className="mt-3 flex flex-col gap-2 border-l-2 border-primary/30 pl-4">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Reply to @${c.user?.username ?? "user"}…`}
                        className="min-h-[60px] rounded-2xl border border-border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          disabled={!replyText.trim() || addReply.isPending}
                          onClick={() => addReply.mutate()}
                        >
                          {addReply.isPending && <Loader2 className="animate-spin" />} Post reply
                        </Button>
                      </div>
                    </div>
                  )}
                  {replies.length > 0 && (
                    <div className="mt-4 space-y-3 border-l-2 border-border pl-4">
                      {replies.map((r: any) => (
                        <div key={r.id} className="rounded-xl bg-secondary/40 p-3">
                          <CommentHeader c={r} compact />
                          <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{r.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}

type Panel = "assistant" | "summary" | "podcast" | "knowledge" | "flashcards" | "quiz" | "notes";

function PostAIBar({ postId, language, isBook }: { postId: string; language: LanguageCode; isBook?: boolean }) {
  const [open, setOpen] = useState<Panel | null>(null);
  const items: { key: Panel; label: string; icon: React.ReactNode }[] = [
    { key: "assistant", label: "Ask AI", icon: <Sparkles className="h-4 w-4" /> },
    { key: "summary", label: "Summary", icon: <FileText className="h-4 w-4" /> },
    { key: "podcast", label: "Podcast", icon: <Headphones className="h-4 w-4" /> },
    { key: "knowledge", label: "Timeline", icon: <Network className="h-4 w-4" /> },
    ...(isBook
      ? ([
          { key: "flashcards" as Panel, label: "Cards", icon: <Layers className="h-4 w-4" /> },
          { key: "quiz" as Panel, label: "Quiz", icon: <Brain className="h-4 w-4" /> },
          { key: "notes" as Panel, label: "Notes", icon: <Notebook className="h-4 w-4" /> },
        ] as { key: Panel; label: string; icon: React.ReactNode }[])
      : []),
  ];
  return (
    <>
      {/* AI bar: vertical on the right edge below lg, floating bottom pill on desktop */}
      <div className="pointer-events-none fixed z-30 animate-in fade-in slide-in-from-right-4 duration-500 max-lg:right-[max(0.5rem,env(safe-area-inset-right))] max-lg:top-[calc(50%-2rem)] max-lg:-translate-y-1/2 lg:inset-x-0 lg:bottom-8 lg:flex lg:justify-center lg:px-4 lg:slide-in-from-bottom-4">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-card/90 p-1 shadow-[var(--shadow-book)] backdrop-blur [scrollbar-width:none] max-lg:max-h-[calc(100dvh-16rem-env(safe-area-inset-bottom))] max-lg:flex-col max-lg:overflow-y-auto lg:max-w-[95vw] lg:flex-row lg:overflow-x-auto">
          {items.map((it) => (
            <button
              key={it.key}
              onClick={() => setOpen(open === it.key ? null : it.key)}
              aria-label={it.label}
              title={it.label}
              className={
                "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-xs font-medium transition-all duration-200 active:scale-95 max-lg:h-10 max-lg:w-10 lg:px-3 lg:py-2 " +
                (open === it.key
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-secondary")
              }
            >
              {it.icon}
              <span className="hidden lg:inline">{it.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Side sheet */}
      {open && (
        <div
          className="fixed inset-0 z-50"
          onKeyDown={(e) => e.key === "Escape" && setOpen(null)}
        >
          <button
            aria-label="Close"
            onClick={() => setOpen(null)}
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm animate-in fade-in duration-200"
          />
          <aside
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            ref={(el) => el?.focus()}
            className="absolute right-0 top-0 h-full w-full max-w-md bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-2xl outline-none animate-in slide-in-from-right duration-300 sm:border-l sm:border-border"
          >
            <button
              onClick={() => setOpen(null)}
              className="absolute right-3 top-3 z-10 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
            {open === "assistant" && <AssistantPanel postId={postId} language={language} />}
            {open === "summary" && <SummaryPanel postId={postId} language={language} />}
            {open === "podcast" && <PodcastPlayer postId={postId} language={language} />}
            {open === "knowledge" && <KnowledgeTimelinePanel postId={postId} language={language} />}
            {open === "flashcards" && <FlashcardsPanel postId={postId} language={language} />}
            {open === "quiz" && <QuizPanel postId={postId} language={language} />}
            {open === "notes" && <StudyNotesPanel postId={postId} language={language} />}
          </aside>
        </div>
      )}
    </>
  );
}

function CommentHeader({ c, compact }: { c: any; compact?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Avatar className={(compact ? "h-6 w-6" : "h-7 w-7") + " border border-border"}>
        <AvatarImage src={c.user?.avatar_url ?? undefined} />
        <AvatarFallback className="bg-secondary text-[10px]">
          {(c.user?.full_name || c.user?.username || "U").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <Link
        to="/user/$username"
        params={{ username: c.user?.username ?? "" }}
        className="inline-flex items-center gap-1 font-medium hover:underline"
      >
        {c.user?.full_name || c.user?.username}
        <VerifiedBadge verified={c.user?.verified} className="h-3.5 w-3.5" />
      </Link>
      <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
    </div>
  );
}

function BookMetaBar({
  postId,
  status,
  readingMinutes,
  difficulty,
  keywords,
  isAuthor,
}: {
  postId: string;
  status: string | null;
  readingMinutes: number | null;
  difficulty: string | null;
  keywords: string[];
  isAuthor: boolean;
}) {
  const qc = useQueryClient();
  const runAnalyze = useServerFn(analyzeBook);
  const runGet = useServerFn(getBookAnalysis);
  const [busy, setBusy] = useState(false);
  const [localStatus, setLocalStatus] = useState<string>(status ?? "pending");

  useEffect(() => setLocalStatus(status ?? "pending"), [status]);

  // Poll while analyzing
  useEffect(() => {
    if (localStatus !== "analyzing") return;
    const t = setInterval(async () => {
      try {
        const r = await runGet({ data: { postId } });
        if (r.status !== "analyzing") {
          setLocalStatus(r.status);
          qc.invalidateQueries({ queryKey: ["post", postId] });
          clearInterval(t);
        }
      } catch {
        /* ignore */
      }
    }, 5000);
    return () => clearInterval(t);
  }, [localStatus, postId, runGet, qc]);

  async function analyze() {
    setBusy(true);
    setLocalStatus("analyzing");
    try {
      await runAnalyze({ data: { postId, force: true } });
      qc.invalidateQueries({ queryKey: ["post", postId] });
      setLocalStatus("ready");
      toast.success("Book analyzed");
    } catch (e: unknown) {
      setLocalStatus("failed");
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
      {readingMinutes != null && (
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
          <Clock className="h-3 w-3" /> {readingMinutes} min
        </span>
      )}
      {difficulty && (
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 capitalize text-muted-foreground">
          <GraduationCap className="h-3 w-3" /> {difficulty}
        </span>
      )}
      {(keywords ?? []).slice(0, 5).map((k) => (
        <span key={k} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground">
          {k}
        </span>
      ))}
      {localStatus === "analyzing" && (
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary">
          <Loader2 className="h-3 w-3 animate-spin" /> AI is analyzing this book…
        </span>
      )}
      {localStatus === "failed" && (
        <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-red-500">
          Analysis failed
        </span>
      )}
      {isAuthor && (localStatus === "pending" || localStatus === "failed") && (
        <button
          onClick={analyze}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
          Analyze with AI
        </button>
      )}
    </div>
  );
}
