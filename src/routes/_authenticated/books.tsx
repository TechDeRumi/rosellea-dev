import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookCard, type BookCardData } from "@/components/BookCard";
import { CATEGORIES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/books")({
  head: () => ({
    meta: [
      { title: "Books library — Rosellea" },
      { name: "description", content: "Browse the multilingual book library on Rosellea." },
    ],
  }),
  component: BooksPage,
});

function BooksPage() {
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const books = useQuery({
    queryKey: ["books", cat, q],
    queryFn: async () => {
      let query = supabase
        .from("posts")
        .select("id,title,cover_image_url,category,keywords,topics,author:profiles!posts_author_id_fkey(username,full_name)")
        .eq("type", "book")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (cat) query = query.eq("category", cat);
      if (q.trim()) {
        const term = q.trim().replace(/[,%]/g, "");
        // Search across title, keywords[] and topics[] (arrays via .cs operator).
        query = query.or(
          `title.ilike.%${term}%,keywords.cs.{${term}},topics.cs.{${term}}`,
        );
      }
      const { data, error } = await query.limit(60);
      if (error) throw error;
      return (data ?? []) as unknown as BookCardData[];
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Library</h1>
        <p className="text-sm text-muted-foreground">Every book is auto-translated into five languages on publish.</p>
      </div>
      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search books by title…"
          className="pl-9"
        />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Chip active={cat === null} onClick={() => setCat(null)}>All</Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
          </Chip>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {books.isLoading
          ? Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-secondary" />
            ))
          : (books.data?.length ?? 0) === 0
            ? <p className="col-span-full rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">No books yet.</p>
            : books.data!.map((b) => <BookCard key={b.id} book={b} />)}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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
