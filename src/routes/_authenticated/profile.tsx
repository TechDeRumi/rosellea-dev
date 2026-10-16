import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LANGUAGES, CATEGORIES, type LanguageCode } from "@/lib/constants";
import { BookCard } from "@/components/BookCard";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [{ title: "My profile — Rosellea" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const profile = useQuery({
    queryKey: ["my-profile-full", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const myPosts = useQuery({
    queryKey: ["my-posts", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id,title,excerpt,content,type,category,cover_image_url,created_at,author:profiles!posts_author_id_fkey(id,username,full_name,avatar_url,verified),likes(count),comments(count)")
        .eq("author_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []).map((p: any) => ({
        ...p,
        like_count: p.likes?.[0]?.count ?? 0,
        comment_count: p.comments?.[0]?.count ?? 0,
      })) as FeedPost[];
    },
  });

  const bookmarks = useQuery({
    queryKey: ["my-bookmarks", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookmarks")
        .select("post:posts(id,title,excerpt,content,type,category,cover_image_url,created_at,author:profiles!posts_author_id_fkey(id,username,full_name,avatar_url,verified))")
        .order("created_at", { ascending: false });
      return (data ?? []).map((r: any) => r.post).filter(Boolean);
    },
  });

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [langs, setLangs] = useState<LanguageCode[]>(["en"]);
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    if (!profile.data) return;
    setFullName(profile.data.full_name ?? "");
    setUsername(profile.data.username);
    setBio(profile.data.bio ?? "");
    setLangs((profile.data.preferred_languages ?? ["en"]) as LanguageCode[]);
    setInterests(profile.data.interests ?? []);
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) return;
      let avatar_url = profile.data?.avatar_url ?? null;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        avatar_url = signed?.signedUrl ?? avatar_url;
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          username: username,
          bio,
          preferred_languages: langs,
          interests,
          avatar_url,
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["my-profile", user?.id] });
      qc.invalidateQueries({ queryKey: ["my-profile-full", user?.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save"),
  });

  const initials = (fullName || username || "U").split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Tabs defaultValue="me">
        <TabsList>
          <TabsTrigger value="me">Profile</TabsTrigger>
          <TabsTrigger value="published">My content</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
        </TabsList>

        <TabsContent value="me" className="mt-6 space-y-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-20 w-20 border border-border">
              <AvatarImage src={profile.data?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">{initials}</AvatarFallback>
            </Avatar>
            <label className="cursor-pointer rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-secondary/60">
              <Upload className="mr-2 inline h-4 w-4" />
              {avatarFile?.name || "Change avatar"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} />
            </label>
            {profile.data?.username && (
              <Link to="/user/$username" params={{ username: profile.data.username }} className="ml-auto text-sm text-primary hover:underline">
                View public profile →
              </Link>
            )}
          </div>

          {profile.data?.verified && (
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300">
              <VerifiedBadge verified className="h-4 w-4" /> Verified account
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase())} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1 min-h-[100px] rounded-2xl" />
          </div>
          <div>
            <Label>Preferred languages</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {LANGUAGES.map((l) => {
                const active = langs.includes(l.code);
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() =>
                      setLangs((prev) => (active ? prev.filter((c) => c !== l.code) : [...prev, l.code]))
                    }
                    className={
                      "rounded-full border px-3 py-1.5 text-xs font-medium " +
                      (active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-secondary")
                    }
                  >
                    {l.flag} {l.native}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label>Interests</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const active = interests.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setInterests((prev) => (active ? prev.filter((x) => x !== c) : [...prev, c]))
                    }
                    className={
                      "rounded-full border px-3 py-1.5 text-xs font-medium " +
                      (active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-secondary")
                    }
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Button variant="hero" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="animate-spin" />} Save changes
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="published" className="mt-6">
          {myPosts.isLoading ? (
            <div className="h-44 animate-pulse rounded-3xl bg-secondary" />
          ) : (myPosts.data?.length ?? 0) === 0 ? (
            <p className="rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
              You haven't published anything yet.
            </p>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-muted-foreground">Books</h3>
              <div className="mt-3 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
                {myPosts.data!.filter((p) => p.type === "book").map((b) => (
                  <BookCard key={b.id} book={{ id: b.id, title: b.title, cover_image_url: b.cover_image_url, category: b.category, author: b.author }} />
                ))}
              </div>
              <h3 className="mt-8 text-sm font-semibold text-muted-foreground">Articles & stories</h3>
              <div className="mt-3 grid gap-5 md:grid-cols-2">
                {myPosts.data!.filter((p) => p.type !== "book").map((p) => <PostCard key={p.id} post={p} />)}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-6">
          {(bookmarks.data?.length ?? 0) === 0 ? (
            <p className="rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
              No bookmarks yet. Tap the save icon on any post.
            </p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {(bookmarks.data ?? []).map((p: any) => (
                <PostCard
                  key={p.id}
                  post={{
                    ...p,
                    like_count: 0,
                    comment_count: 0,
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
