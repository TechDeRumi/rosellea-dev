import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { AI_MODELS, isModelUnavailableError, MODEL_UNAVAILABLE_MESSAGE } from "@/lib/ai-models";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  ur: "Urdu",
  ps: "Pashto",
  ar: "Arabic",
  tr: "Turkish",
};

const Body = z.object({
  postId: z.string().uuid(),
  language: z.enum(["en", "ur", "ps", "ar", "tr"]),
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(40)
    .optional(),
});

function unauthorized(msg = "Unauthorized") {
  return new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !GEMINI_API_KEY) {
          return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500 });
        }
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) return unauthorized();
        const token = auth.slice(7);
        const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const claims = await supabase.auth.getClaims(token);
        if (claims.error || !claims.data?.claims?.sub) return unauthorized("Invalid token");
        const userId = claims.data.claims.sub;

        let body: z.infer<typeof Body>;
        try {
          body = Body.parse(await request.json());
        } catch (e) {
          return new Response(JSON.stringify({ error: "Bad request" }), { status: 400 });
        }

        // Load post + preferred-language content
        const post = await supabase
          .from("posts")
          .select("type,title,content,original_language,category,translations:post_translations(language,title,content)")
          .eq("id", body.postId)
          .maybeSingle();
        if (!post.data) return new Response(JSON.stringify({ error: "Post not found" }), { status: 404 });
        let src = { title: post.data.title, content: (post.data.content as string) ?? "" };
        if (body.language !== post.data.original_language) {
          const tr = (post.data.translations as { language: string; title: string; content: string }[] | null)
            ?.find((t) => t.language === body.language);
          if (tr) src = { title: tr.title, content: tr.content };
        }

        // For books, augment context with generated chapter content
        // (posts.content is empty for PDF books).
        if (post.data.type === "book") {
          const chapters = await supabase
            .from("book_chapters")
            .select("title,summary,content,keywords")
            .eq("post_id", body.postId)
            .order("idx", { ascending: true });
          if (chapters.data && chapters.data.length > 0) {
            const bookCtx = chapters.data
              .map(
                (c, i) =>
                  `## Chapter ${i + 1}: ${c.title}\n${c.summary ?? ""}\n\n${(c.content as string) ?? ""}`,
              )
              .join("\n\n");
            src = { title: src.title, content: bookCtx };
          }
        }

        const langName = LANG_NAMES[body.language];
        // strip HTML for cleaner context
        const plain = (src.content || "")
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/(p|h[1-6]|li|blockquote|div)>/gi, "\n\n")
          .replace(/<[^>]+>/g, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim()
          .slice(0, 60000);

        const system =
          `You are Rosellea's in-context reading assistant for the article/book below. ` +
          `Always answer in ${langName} (unless the user explicitly asks for another language). ` +
          `Stay grounded in the provided CONTENT — when the user asks about anything from the text (summary, explanation, key points, study notes, vocabulary, comparisons, exam prep, real-world examples, the author's arguments), draw your answer from the CONTENT. ` +
          `If the user asks something the text does not cover, you may answer from general knowledge but clearly say so. ` +
          `Be warm, accurate, educational. Use short paragraphs and bullet lists when helpful. Avoid hallucinated citations.\n\n` +
          `--- BEGIN CONTENT ---\nTITLE: ${src.title}\nCATEGORY: ${post.data.category ?? "general"}\n\n${plain}\n--- END CONTENT ---`;

        // Save user message (best effort) before streaming.
        await supabase
          .from("assistant_messages")
          .insert({ post_id: body.postId, user_id: userId, role: "user", content: body.message });

        // Forward to Google Gemini with streaming
        const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GEMINI_API_KEY}`,
          },
          body: JSON.stringify({
            model: AI_MODELS.fast,
            stream: true,
            messages: [
              { role: "system", content: system },
              ...(body.history ?? []).slice(-20),
              { role: "user", content: body.message },
            ],
          }),
        });
        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text();
          if (upstream.status === 429)
            return new Response("AI is busy. Try again in a moment.", { status: 429 });
          if (upstream.status === 402)
            return new Response("Gemini quota exhausted. Check your Google AI billing.", { status: 402 });
          if (isModelUnavailableError(upstream.status, text))
            return new Response(MODEL_UNAVAILABLE_MESSAGE, { status: 502 });
          return new Response(`AI error: ${text.slice(0, 200)}`, { status: 502 });
        }

        // Re-stream as plain text; persist final assistant message at end.
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = "";
        let full = "";
        const stream = new ReadableStream<Uint8Array>({
          async pull(controller) {
            const { value, done } = await reader.read();
            if (done) {
              try {
                await supabase.from("assistant_messages").insert({
                  post_id: body.postId,
                  user_id: userId,
                  role: "assistant",
                  content: full,
                });
              } catch {
                /* ignore */
              }
              controller.close();
              return;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const raw of lines) {
              const line = raw.trim();
              if (!line.startsWith("data:")) continue;
              const data = line.slice(5).trim();
              if (data === "[DONE]") continue;
              try {
                const json = JSON.parse(data);
                const delta = json?.choices?.[0]?.delta?.content;
                if (typeof delta === "string" && delta.length > 0) {
                  full += delta;
                  controller.enqueue(encoder.encode(delta));
                }
              } catch {
                /* ignore parse errors of keepalives */
              }
            }
          },
          cancel() {
            reader.cancel().catch(() => {});
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});