import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { CATEGORIES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/articles")({
  head: () => ({
    meta: [
      { title: "Articles & Stories — Rosellea" },
      { name: "description", content: "A multilingual feed of articles and stories from writers across the world." },
    ],
  }),
  component: ArticlesPage,
});

function ArticlesPage() {
  const [tab, setTab] = useState<"article" | "story" | "all">("all");
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const feed = useQuery({
    queryKey: ["articles", tab, cat, q],
    queryFn: async () => {
      let query = supabase
        .from("posts")
        .select(
          "id,title,excerpt,content,type,category,cover_image_url,created_at," +
            "author:profiles!posts_author_id_fkey(id,username,full_name,avatar_url)," +
            "likes(count),comments(count)",
        )
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (tab !== "all") query = query.eq("type", tab);
      else query = query.neq("type", "book");
      if (cat) query = query.eq("category", cat);
      if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
      const { data, error } = await query.limit(60);
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        ...p,
        like_count: p.likes?.[0]?.count ?? 0,
        comment_count: p.comments?.[0]?.count ?? 0,
      })) as FeedPost[];
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Feed</h1>
        <p className="text-sm text-muted-foreground">Articles & stories — switch language inside any post.</p>
      </div>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search articles & stories…"
          className="pl-9"
        />
      </div>

      <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-2">
        {(["all", "article", "story"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors " +
              (tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/70")
            }
          >
            {t === "all" ? "All posts" : `${t}s`}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <ChipButton active={cat === null} onClick={() => setCat(null)}>All</ChipButton>
        {CATEGORIES.map((c) => (
          <ChipButton key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
          </ChipButton>
        ))}
      </div>

      <div className="mt-6 space-y-5">
        {feed.isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-3xl bg-secondary" />
            ))
          : (feed.data?.length ?? 0) === 0
            ? <p className="rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">No posts yet — be the first to publish.</p>
            : feed.data!.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
    </div>
  );
}

function ChipButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:bg-secondary")
      }
    >
      {children}
    </button>
  );
}
