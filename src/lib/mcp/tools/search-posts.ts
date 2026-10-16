import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_posts",
  title: "Search articles and books",
  description: "Search published Rosellea articles and books by title, optionally filtered by type.",
  inputSchema: {
    query: z.string().max(200).optional().describe("Text to match in the title. Omit to list the latest."),
    type: z.enum(["article", "book"]).optional().describe("Limit to articles or books."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, type, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("posts")
      .select("id, title, excerpt, type, category, original_language, created_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (query) q = q.ilike("title", `%${query.replace(/[%_]/g, "")}%`);
    if (type) q = q.eq("type", type);
    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    const posts = (data ?? []).map((p) => ({
      id: String(p.id),
      title: String(p.title),
      excerpt: p.excerpt ? String(p.excerpt) : null,
      type: String(p.type),
      category: String(p.category),
      language: String(p.original_language),
      created_at: String(p.created_at),
    }));
    const text = posts.length
      ? posts.map((p) => `${p.id} [${p.type}] ${p.title}`).join("\n")
      : "No matching posts.";
    return { content: [{ type: "text", text }], structuredContent: { posts } };
  },
});
