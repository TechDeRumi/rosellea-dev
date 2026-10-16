import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_bookmarks",
  title: "List my bookmarks",
  description: "List the articles and books the signed-in user has bookmarked.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("bookmarks")
      .select("post_id, created_at, posts(title, type)")
      .eq("user_id", ctx.getUserId()!)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new ToolError(error.message);
    const bookmarks = (data ?? []).map((b) => {
      const p = (Array.isArray(b.posts) ? b.posts[0] : b.posts) as { title?: string; type?: string } | null;
      return { post_id: String(b.post_id), title: String(p?.title ?? ""), type: String(p?.type ?? "") };
    });
    const text = bookmarks.length
      ? bookmarks.map((b) => `${b.post_id} [${b.type}] ${b.title}`).join("\n")
      : "No bookmarks yet.";
    return { content: [{ type: "text", text }], structuredContent: { bookmarks } };
  },
});
