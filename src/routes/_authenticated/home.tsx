import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { BookCard, type BookCardData } from "@/components/BookCard";
import { CATEGORIES } from "@/lib/constants";
import { useState } from "react";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — Rosellea" },
      { name: "description", content: "Trending books and the latest articles, stories and ideas across languages." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [category, setCategory] = useState<string | null>(null);

  const books = useQuery({
    queryKey: ["home-books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id,title,cover_image_url,category,author:profiles!posts_author_id_fkey(username,full_name,verified)")
        .eq("type", "book")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as unknown as BookCardData[];
    },
  });

  const feed = useQuery({
    queryKey: ["home-feed", category],
    queryFn: async () => {
      let q = supabase
        .from("posts")
        .select(
          "id,title,excerpt,content,type,category,cover_image_url,created_at," +
            "author:profiles!posts_author_id_fkey(id,username,full_name,avatar_url,verified)," +
            "likes(count),comments(count)",
        )
        .neq("type", "book")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(30);
      if (category) q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        ...p,
        like_count: p.likes?.[0]?.count ?? 0,
        comment_count: p.comments?.[0]?.count ?? 0,
      })) as FeedPost[];
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 sm:p-12"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Knowledge Beyond Language
          </div>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Read every great idea, in your language.
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Rosellea instantly translates every article, story and book across five languages — so writers can publish
            once and readers can read anywhere.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/write" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] hover:opacity-90">
              Start writing
            </Link>
            <Link to="/books" className="rounded-full border border-border bg-background/60 px-5 py-2.5 text-sm font-semibold backdrop-blur hover:bg-secondary/60">
              Browse library
            </Link>
          </div>
        </div>
      </section>

      {/* Discover books showcase */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Discover books</h2>
            <p className="text-sm text-muted-foreground">Hand-picked from the Rosellea library.</p>
          </div>
        </div>
        {books.isLoading ? (
          <div className="flex gap-5 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] w-40 shrink-0 animate-pulse rounded-2xl bg-secondary" />
            ))}
          </div>
        ) : (books.data?.length ?? 0) === 0 ? (
          <EmptyState text="No books yet. Be the first to publish one." href="/write" cta="Upload a book" />
        ) : (
          <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 md:grid-cols-4">
            {books.data!.slice(0, 4).map((b) => (
              <Link
                key={b.id}
                to="/post/$id"
                params={{ id: b.id }}
                className="group flex w-44 shrink-0 snap-start flex-col rounded-3xl border border-border bg-card p-3 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-book)] sm:w-auto"
              >
                <div className="aspect-[2/3] overflow-hidden rounded-2xl bg-secondary">
                  {b.cover_image_url ? (
                    <img src={b.cover_image_url} alt={b.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-end bg-gradient-to-br from-primary/80 to-primary p-4">
                      <span className="line-clamp-4 text-lg font-bold leading-tight text-primary-foreground">{b.title}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 px-1">
                  <div className="text-[10px] font-medium uppercase tracking-widest text-primary">{b.category}</div>
                  <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">{b.title}</h3>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {b.author?.full_name || b.author?.username || "Unknown"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Trending books */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Trending books</h2>
            <p className="text-sm text-muted-foreground">Fresh additions to the multilingual library.</p>
          </div>
          <Link to="/books" className="text-sm font-medium text-primary hover:underline">See all →</Link>
        </div>
        {books.isLoading ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-secondary" />
            ))}
          </div>
        ) : (books.data?.length ?? 0) === 0 ? (
          <EmptyState text="No books yet. Be the first to publish one." href="/write" cta="Upload a book" />
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
            {books.data!.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        )}
      </section>

      {/* Category chips */}
      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Latest in the feed</h2>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setCategory(null)}
            className={
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
              (category === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-secondary")
            }
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                (category === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary")
              }
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {feed.isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-44 animate-pulse rounded-3xl bg-secondary" />
              ))
            : (feed.data?.length ?? 0) === 0
              ? <EmptyState text="No posts yet in this category." href="/write" cta="Write a post" />
              : feed.data!.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      </section>
    </div>
  );
}

function EmptyState({ text, href, cta }: { text: string; href: "/write"; cta: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Link to={href} className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
        {cta}
      </Link>
    </div>
  );
}
