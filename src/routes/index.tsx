import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rosellea — Knowledge Beyond Language" },
      {
        name: "description",
        content: "AI-powered multilingual reading and publishing — write once, read everywhere.",
      },
      { property: "og:title", content: "Rosellea — Knowledge Beyond Language" },
      {
        property: "og:description",
        content: "AI-powered multilingual reading and publishing — write once, read everywhere.",
      },
    ],
  }),
  component: Splash,
  ssr: false,
});

function Splash() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const params = new URLSearchParams(window.location.search);
    const requested = params.get("to");

    async function resolveDestination() {
      const { data } = await supabase.auth.getSession();
      return requested && requested.startsWith("/")
        ? requested
        : data.session
          ? "/home"
          : "/auth";
    }

    if (reduce) {
      resolveDestination().then((to) => navigate({ to: to as any, replace: true }));
      return;
    }

    const holdT = setTimeout(() => setStage("hold"), 1500);
    const outT = setTimeout(() => setStage("out"), 2800);
    const goT = setTimeout(async () => {
      const to = await resolveDestination();
      navigate({ to: to as any, replace: true });
    }, 3400);
    return () => {
      clearTimeout(holdT);
      clearTimeout(outT);
      clearTimeout(goT);
    };
  }, [navigate]);

  return (
    <div
      className={
        "relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background text-foreground transition-opacity duration-500 " +
        (stage === "out" ? "opacity-0" : "opacity-100")
      }
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-splash-glow"
        style={{ background: "var(--gradient-hero)" }}
      />
      <div className="relative flex flex-col items-center gap-6">
        <div className="animate-splash-zoom">
          <Wordmark className="h-14 sm:h-20 md:h-24" />
        </div>
        <p
          className={
            "text-base text-muted-foreground sm:text-lg transition-all duration-700 " +
            (stage === "in" ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0")
          }
        >
          Knowledge Beyond Language
        </p>
      </div>
    </div>
  );
}
