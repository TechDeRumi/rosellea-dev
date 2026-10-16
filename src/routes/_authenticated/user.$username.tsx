import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { BookCard } from "@/components/BookCard";
import { LANG_MAP, type LanguageCode } from "@/lib/constants";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/user/$username")({
  component: UserProfilePage,
});

function UserProfilePage() {
  const { username } = Route.useParams();
  const qc = useQueryClient();

  const profile = useQuery({
    queryKey: ["public-profile", username],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      return data;
    },
  });

  const posts = useQuery({
    queryKey: ["user-posts", username],
    enabled: !!profile.data?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id,title,excerpt,content,type,category,cover_image_url,created_at,author:profiles!posts_author_id_fkey(id,username,full_name,avatar_url,verified),likes(count),comments(count)")
        .eq("author_id", profile.data!.id)
        .eq("published", true)
        .order("created_at", { ascending: false });
      return (data ?? []).map((p: any) => ({
        ...p,
        like_count: p.likes?.[0]?.count ?? 0,
        comment_count: p.comments?.[0]?.count ?? 0,
      })) as FeedPost[];
    },
  });

  // Realtime verification update
  useEffect(() => {
    if (!profile.data?.id) return;
    const channel = supabase
      .channel(`profile-${profile.data.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${profile.data.id}` },
        () => qc.invalidateQueries({ queryKey: ["public-profile", username] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile.data?.id, qc, username]);

  if (profile.isLoading) return <div className="mx-auto max-w-4xl p-10">Loading…</div>;
  if (!profile.data) return <div className="mx-auto max-w-4xl p-10">User not found.</div>;
  const p = profile.data;
  const initials = (p.full_name || p.username || "U").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div
        className="rounded-3xl border border-border bg-card p-8"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        <div className="flex flex-wrap items-center gap-6">
          <Avatar className="h-24 w-24 border-2 border-border">
            <AvatarImage src={p.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
              {p.full_name || p.username}
              <VerifiedBadge verified={p.verified} className="h-6 w-6" />
            </h1>
            <p className="text-sm text-muted-foreground">@{p.username}</p>
            {p.bio && <p className="mt-3 max-w-prose text-sm">{p.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {(p.preferred_languages ?? []).map((l: LanguageCode) => (
                <span key={l} className="rounded-full bg-background/60 px-3 py-1 text-xs">
                  {LANG_MAP[l].flag} {LANG_MAP[l].native}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-bold tracking-tight">Books</h2>
        <div className="mt-3 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
          {(posts.data ?? []).filter((x) => x.type === "book").map((b) => (
            <BookCard
              key={b.id}
              book={{ id: b.id, title: b.title, cover_image_url: b.cover_image_url, category: b.category, author: b.author }}
            />
          ))}
          {(posts.data ?? []).filter((x) => x.type === "book").length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">No books yet.</p>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">Articles & stories</h2>
        <div className="mt-3 grid gap-5 md:grid-cols-2">
          {(posts.data ?? []).filter((x) => x.type !== "book").map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          {(posts.data ?? []).filter((x) => x.type !== "book").length === 0 && (
            <p className="text-sm text-muted-foreground">No posts yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
