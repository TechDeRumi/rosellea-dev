import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

export default defineTool({
  name: "get_post",
  title: "Read an article or book",
  description: "Get one article or book you can access, with its text (articles) or AI analysis (books).",
  inputSchema: { id: z.string().uuid().describe("Post ID from search_posts or list_my_posts.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("posts")
      .select("id, title, type, category, original_language, content, keywords, topics, reading_minutes, created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!data) throw new ToolError("Post not found");
    const body = stripHtml(String(data.content ?? "")).slice(0, 20000);
    const post = {
      id: String(data.id),
      title: String(data.title),
      type: String(data.type),
      category: String(data.category),
      language: String(data.original_language),
      keywords: (data.keywords ?? []).map(String),
      topics: (data.topics ?? []).map(String),
      reading_minutes: data.reading_minutes ?? null,
      text: body,
    };
    return {
      content: [{ type: "text", text: `${post.title}\n\n${body || "(No text body — this is a PDF book.)"}` }],
      structuredContent: { post },
    };
  },
});
