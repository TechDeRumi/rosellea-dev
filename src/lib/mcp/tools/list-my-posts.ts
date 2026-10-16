import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_posts",
  title: "List my posts",
  description: "List the signed-in user's own articles and books, including drafts.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("posts")
      .select("id, title, type, published, created_at")
      .eq("author_id", ctx.getUserId()!)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new ToolError(error.message);
    const posts = (data ?? []).map((p) => ({
      id: String(p.id),
      title: String(p.title),
      type: String(p.type),
      published: Boolean(p.published),
      created_at: String(p.created_at),
    }));
    const text = posts.length
      ? posts.map((p) => `${p.id} [${p.type}${p.published ? "" : ", draft"}] ${p.title}`).join("\n")
      : "You have no posts yet.";
    return { content: [{ type: "text", text }], structuredContent: { posts } };
  },
});
