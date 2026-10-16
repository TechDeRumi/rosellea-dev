import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wordmark } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Rosellea" },
      { name: "description", content: "Sign in to write, publish and read across languages on Rosellea." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/home", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. Welcome to Rosellea.");
    navigate({ to: "/home", replace: true });
  }

  async function google() {
    setGoogleLoading(true);
    const host = window.location.hostname;
    const onLovable = host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com") || host === "localhost";
    if (!onLovable) {
      // Standalone hosts (e.g. Vercel) have no /~oauth broker: use standard OAuth.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) {
        setGoogleLoading(false);
        toast.error("Could not sign in with Google");
      }
      return;
    }
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setGoogleLoading(false);
      toast.error("Could not sign in with Google");
      return;
    }
    if (result.redirected) return;
    setGoogleLoading(false);
    navigate({ to: "/home", replace: true });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{ background: "var(--gradient-hero)" }}
      />
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-10 lg:grid-cols-2">
        <div className="hidden flex-col gap-6 lg:flex">
          <Wordmark className="h-10" />
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight">
            Knowledge
            <br />
            beyond <span className="text-primary">language</span>.
          </h1>
          <p className="max-w-md text-lg text-muted-foreground">
            A book-aesthetic platform where every writer can publish once and every reader can read in their own
            language — English, Urdu, Pashto, Arabic, Turkish.
          </p>
          <div className="mt-4 flex gap-3 text-sm text-muted-foreground">
            <span className="rounded-full border border-border px-3 py-1">🇬🇧 English</span>
            <span className="rounded-full border border-border px-3 py-1">🇵🇰 اردو</span>
            <span className="rounded-full border border-border px-3 py-1">🇦🇫 پښتو</span>
            <span className="rounded-full border border-border px-3 py-1">🇸🇦 العربية</span>
            <span className="rounded-full border border-border px-3 py-1">🇹🇷 Türkçe</span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-book)]">
          <div className="mb-6 flex flex-col items-center gap-3 lg:hidden">
            <Wordmark className="h-8" />
          </div>
          <h2 className="text-2xl font-bold">Welcome to Rosellea</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to start reading & writing.</p>

          <Button
            type="button"
            variant="outline"
            className="mt-6 w-full"
            size="lg"
            disabled={googleLoading}
            onClick={google}
          >
            {googleLoading ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email-in">Email</Label>
                  <Input id="email-in" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw-in">Password</Label>
                  <Input id="pw-in" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" variant="hero" className="w-full" size="lg" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />} Sign in
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email-up">Email</Label>
                  <Input id="email-up" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw-up">Password</Label>
                  <Input id="pw-up" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" variant="hero" className="w-full" size="lg" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />} Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Back to splash</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#EA4335" d="M12 11v3.4h5.4c-.2 1.4-1.6 4-5.4 4-3.2 0-5.8-2.6-5.8-5.9s2.6-5.9 5.8-5.9c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.7 4.1 14.6 3 12 3 6.9 3 2.8 7.1 2.8 12.2S6.9 21.5 12 21.5c6.9 0 9.4-4.9 9.4-7.4 0-.5-.1-.9-.1-1.3H12z"/>
    </svg>
  );
}
