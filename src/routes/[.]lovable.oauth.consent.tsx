import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/Logo";

type OAuthResult = { data: any; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({ meta: [{ title: "Connect an app — Rosellea" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("This connection link is missing its authorization ID.");
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth", search: { next: location.pathname + location.searchStr } as never });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    const { data: u } = await supabase.auth.getUser();
    return { details: data, email: u.user?.email ?? "" };
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-xl font-semibold">Could not load this connection request</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
    </main>
  ),
});

const SCOPE_LABEL: Record<string, string> = {
  openid: "Confirm your identity",
  email: "Share your email address",
  profile: "Share your basic profile",
};

function Consent() {
  const { details, email } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = details?.client?.name ?? "An app";
  const scopes = String(details?.scope ?? details?.scopes ?? "openid email profile").split(/\s+/).filter(Boolean);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("No redirect was returned. Please try again."); return; }
    window.location.href = target;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-book)]">
        <Wordmark className="mb-6 h-6" />
        <h1 className="text-2xl font-bold">Connect {client} to Rosellea</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {client} will be able to use Rosellea's tools as you{email ? ` (${email})` : ""}.
        </p>
        {details?.redirect_uri && (
          <p className="mt-2 break-all text-xs text-muted-foreground">Returns to: {details.redirect_uri}</p>
        )}
        <ul className="mt-5 space-y-1 text-sm">
          {scopes.map((s) => (
            <li key={s}>• {SCOPE_LABEL[s] ?? `Additional permission requested: ${s}`}</li>
          ))}
          <li>• Search and read articles and books, and see your posts and bookmarks</li>
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">This does not bypass Rosellea's permissions.</p>
        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        <div className="mt-6 flex gap-3">
          <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>Approve</Button>
          <Button className="flex-1" variant="outline" disabled={busy} onClick={() => decide(false)}>Cancel connection</Button>
        </div>
      </div>
    </main>
  );
}
