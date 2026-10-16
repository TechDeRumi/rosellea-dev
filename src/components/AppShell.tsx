import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Wordmark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Home, Newspaper, BookOpen, User, PenSquare, Moon, Sun, LogOut, Plus, Shield } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useIsAdmin } from "@/hooks/use-is-admin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/articles", label: "Articles", icon: Newspaper },
  { to: "/books", label: "Books", icon: BookOpen },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: isAdmin } = useIsAdmin();
  const qc = useQueryClient();

  // Realtime: own profile updates (e.g. verification) reflect everywhere
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`me-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["my-profile", user.id] });
          qc.invalidateQueries({ queryKey: ["my-profile-full", user.id] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  function goHomeWithSplash() {
    // Force a full navigation to the splash so the animation always plays.
    window.location.assign("/?to=/home");
  }

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initials =
    (profile?.full_name || profile?.username || user?.email || "U")
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <div className="min-h-screen overflow-x-clip bg-background pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-12">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6 md:h-20">
          <button
            onClick={goHomeWithSplash}
            className="flex shrink-0 items-center"
            aria-label="Rosellea — go home"
          >
            <Wordmark className="h-6" />
          </button>

          {/* Desktop primary nav (lg+). Below lg, the bottom pill is used instead. */}
          <nav className="ml-4 hidden min-w-0 items-center gap-1 lg:flex" aria-label="Primary">
            {NAV.map((n) => {
              const active = pathname === n.to || (n.to !== "/home" && pathname.startsWith(n.to));
              const cls =
                "rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200 " +
                (active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground");
              return n.to === "/home" ? (
                <button key={n.to} onClick={goHomeWithSplash} className={cls} aria-current={active ? "page" : undefined}>
                  {n.label}
                </button>
              ) : (
                <Link key={n.to} to={n.to} className={cls} aria-current={active ? "page" : undefined}>
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
            <Link to="/write" className="hidden lg:block">
              <Button variant="hero" size="sm">
                <PenSquare /> Write
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm">
                  <div className="font-medium">{profile?.full_name || profile?.username || "You"}</div>
                  <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                  <User className="mr-2 h-4 w-4" /> My profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/write" })}>
                  <PenSquare className="mr-2 h-4 w-4" /> Write
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                    <Shield className="mr-2 h-4 w-4" /> Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main>{children}</main>

      {/* Floating Write FAB (mobile) */}
      <Link
        to="/write"
        className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-book)] transition-transform active:scale-95 lg:hidden"
        aria-label="Write"
      >
        <Plus className="h-6 w-6" />
      </Link>

      {/* Single shared bottom nav — same floating pill on every page and screen size */}
      <nav className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 lg:hidden" aria-label="Primary">
        <div className="flex items-center gap-1 rounded-full border border-black/5 bg-white px-2 py-2 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.25)]">
          {NAV.map((n) => {
            const active = pathname === n.to || (n.to !== "/home" && pathname.startsWith(n.to));
            const Icon = n.icon;
            const cls =
              "flex min-w-[64px] flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 transition-all duration-300 " +
              (active
                ? "bg-[#7C3AED] text-white shadow-[0_6px_16px_-6px_rgba(124,58,237,0.6)] -translate-y-0.5"
                : "text-neutral-500 hover:text-neutral-800");
            if (n.to === "/home") {
              return (
                <button key={n.to} onClick={goHomeWithSplash} className={cls}>
                  <Icon className="h-5 w-5" />
                  <span className="text-[11px] font-medium leading-none">{n.label}</span>
                </button>
              );
            }
            return (
              <Link key={n.to} to={n.to} className={cls}>
                <Icon className="h-5 w-5" />
                <span className="text-[11px] font-medium leading-none">{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
