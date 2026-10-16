import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Bookmark } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { previewText } from "@/lib/html";

export type FeedPost = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  type: "article" | "story" | "book";
  category: string;
  cover_image_url: string | null;
  created_at: string;
  like_count: number;
  comment_count: number;
  author: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    verified?: boolean | null;
  } | null;
};

export function PostCard({ post }: { post: FeedPost }) {
  const initials = (post.author?.full_name || post.author?.username || "U")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const preview = previewText(post.excerpt, post.content);

  return (
    <article className="group rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-book)]">
      <div className="flex items-center gap-3">
        <Link
          to="/user/$username"
          params={{ username: post.author?.username ?? "" }}
          className="flex items-center gap-3 hover:opacity-90"
        >
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage src={post.author?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-secondary text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="text-sm">
            <div className="flex items-center gap-1 font-medium leading-tight">
              <span>{post.author?.full_name || post.author?.username || "Unknown"}</span>
              <VerifiedBadge verified={post.author?.verified} className="h-3.5 w-3.5" />
            </div>
            <div className="text-xs text-muted-foreground">
              @{post.author?.username} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </div>
          </div>
        </Link>
        <span className="ml-auto rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {post.category}
        </span>
      </div>

      <Link to="/post/$id" params={{ id: post.id }} className="mt-4 block">
        <h3 className="text-xl font-bold leading-snug tracking-tight transition-colors group-hover:text-primary">
          {post.title}
        </h3>
        {preview ? (
          <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-muted-foreground">{preview}</p>
        ) : null}
        <span className="mt-3 inline-block text-sm font-semibold text-primary">Read more →</span>
      </Link>

      <div className="mt-4 flex items-center gap-5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Heart className="h-4 w-4" /> {post.like_count}</span>
        <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> {post.comment_count}</span>
        <Bookmark className="ml-auto h-4 w-4" />
      </div>
    </article>
  );
}
