import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Rosellea" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const users = useQuery({
    queryKey: ["admin-users", q],
    enabled: isAdmin.data === true,
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url,verified,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (q.trim()) query = query.or(`username.ilike.%${q}%,full_name.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const setVerified = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase.from("profiles").update({ verified }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.verified ? "User verified ✓" : "Verification removed");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  // Wait for auth + role query before deciding access.
  if (!user?.id || isAdmin.isPending || isAdmin.fetchStatus === "fetching") {
    return <div className="mx-auto max-w-3xl p-10 text-sm text-muted-foreground">Checking access…</div>;
  }
  if (isAdmin.data !== true) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Admin · Verification</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Grant or remove the blue verification badge for any user.
      </p>

      <div className="mt-6">
        <Input
          placeholder="Search by username or full name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="mt-6 divide-y divide-border rounded-3xl border border-border bg-card">
        {users.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : (users.data ?? []).length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No users found.</div>
        ) : (
          users.data!.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-4">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={u.avatar_url ?? undefined} />
                <AvatarFallback className="bg-secondary text-xs">
                  {(u.full_name || u.username || "U").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 font-medium">
                  <span className="truncate">{u.full_name || u.username}</span>
                  <VerifiedBadge verified={u.verified} className="h-4 w-4" />
                </div>
                <div className="truncate text-xs text-muted-foreground">@{u.username}</div>
              </div>
              <Button
                size="sm"
                variant={u.verified ? "outline" : "hero"}
                disabled={setVerified.isPending}
                onClick={() => setVerified.mutate({ id: u.id, verified: !u.verified })}
              >
                {setVerified.isPending && setVerified.variables?.id === u.id && <Loader2 className="animate-spin" />}
                {u.verified ? "Remove verification" : "Verify user"}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}