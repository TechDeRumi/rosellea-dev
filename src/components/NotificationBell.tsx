import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Bell, Heart, MessageCircle, BadgeCheck, Reply } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  type: "like" | "comment" | "reply" | "follow" | "verification" | "book" | "article";
  sender_id: string | null;
  post_id: string | null;
  message: string | null;
  read_status: boolean;
  created_at: string;
  sender: { username: string; full_name: string | null; avatar_url: string | null } | null;
};

export function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Notification[]> => {
      const { data } = await supabase
        .from("notifications")
        .select(
          "id,type,sender_id,post_id,message,read_status,created_at," +
            "sender:profiles!notifications_sender_id_fkey(username,full_name,avatar_url)",
        )
        .eq("receiver_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as any;
    },
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `receiver_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      await supabase
        .from("notifications")
        .update({ read_status: true })
        .eq("receiver_id", user.id)
        .eq("read_status", false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const unread = (list.data ?? []).filter((n) => !n.read_status).length;

  return (
    <DropdownMenu onOpenChange={(o) => { if (!o && unread > 0) markAllRead.mutate(); }}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-secondary"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-3 py-2 text-sm font-semibold">Notifications</div>
        <div className="max-h-96 overflow-y-auto">
          {(list.data ?? []).length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              You're all caught up.
            </div>
          ) : (
            list.data!.map((n) => <NotificationRow key={n.id} n={n} />)
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationRow({ n }: { n: Notification }) {
  const who = n.sender?.full_name || n.sender?.username || "Someone";
  const Icon =
    n.type === "like" ? Heart : n.type === "comment" ? MessageCircle : n.type === "reply" ? Reply : BadgeCheck;
  const text =
    n.message ??
    (n.type === "like"
      ? `${who} liked your post`
      : n.type === "comment"
        ? `${who} commented on your post`
        : n.type === "reply"
          ? `${who} replied to your comment`
          : n.type === "verification"
            ? "You have been verified ✓"
            : `${who} interacted with your content`);

  const inner = (
    <div className={"flex items-start gap-3 px-3 py-3 " + (n.read_status ? "" : "bg-primary/5")}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="flex-1 text-sm">
        <p className="leading-snug">{text}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );

  return n.post_id ? (
    <Link to="/post/$id" params={{ id: n.post_id }} className="block hover:bg-secondary/60">
      {inner}
    </Link>
  ) : (
    <div>{inner}</div>
  );
}