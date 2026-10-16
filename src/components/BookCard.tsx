import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export type BookCardData = {
  id: string;
  title: string;
  cover_image_url: string | null;
  category: string;
  author: { username: string; full_name: string | null; verified?: boolean | null } | null;
};

const PALETTES = [
  "from-violet-500 to-fuchsia-500",
  "from-amber-500 to-rose-500",
  "from-sky-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-orange-500",
  "from-indigo-600 to-violet-500",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function BookCard({ book }: { book: BookCardData }) {
  const palette = PALETTES[hash(book.id) % PALETTES.length];

  return (
    <Link to="/post/$id" params={{ id: book.id }} className="group block">
      <div className="book-cover relative aspect-[2/3] overflow-hidden rounded-xl">
        {book.cover_image_url ? (
          <img
            src={book.cover_image_url}
            alt={book.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={`flex h-full w-full flex-col justify-between bg-gradient-to-br ${palette} p-4 text-white`}>
            <BookOpen className="h-5 w-5 opacity-80" />
            <div>
              <div className="text-[10px] uppercase tracking-widest opacity-80">{book.category}</div>
              <h4 className="mt-1 line-clamp-4 text-lg font-bold leading-tight">{book.title}</h4>
            </div>
          </div>
        )}
      </div>
      <div className="mt-3">
        <h4 className="line-clamp-2 text-sm font-semibold leading-snug">{book.title}</h4>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <span>{book.author?.full_name || book.author?.username || "Unknown"}</span>
          <VerifiedBadge verified={book.author?.verified} className="h-3 w-3" />
        </p>
      </div>
    </Link>
  );
}
