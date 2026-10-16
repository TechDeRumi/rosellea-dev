import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { AI_MODELS } from "./ai-models";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  ur: "Urdu",
  ps: "Pashto",
  ar: "Arabic",
  tr: "Turkish",
};

const AssistInput = z.object({
  text: z.string().min(1).max(200000),
  action: z.enum(["improve", "grammar", "expand", "simplify", "formal", "storytelling", "academic"]),
});

export const aiAssistWriting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AssistInput.parse(d))
  .handler(async ({ data }) => {
    const { callAI } = await import("./ai-gateway.server");
    const directives: Record<string, string> = {
      improve: "Rewrite the text to improve clarity, flow and word choice while preserving meaning and the author's voice. Keep the same language.",
      grammar: "Fix grammar, spelling and punctuation. Preserve meaning, voice and language. Do not rewrite stylistically.",
      expand: "Expand the text with richer detail, vivid examples, and stronger paragraph development. Keep the same language and voice.",
      simplify: "Rewrite in clearer, simpler language a wide audience can read. Keep the same language and intent.",
      formal: "Rewrite in a polished, formal tone. Same language and meaning.",
      storytelling: "Rewrite in a vivid storytelling tone with sensory detail and narrative cadence. Same language and meaning.",
      academic: "Rewrite in a rigorous academic tone with precise terminology. Same language and meaning.",
    };
    const out = await callAI({
      system:
        "You are a careful multilingual writing assistant. The text may contain HTML tags (e.g. <p>, <h1>, <strong>, <em>, <ul>, <li>, <img>, <a>). Preserve every HTML tag and attribute EXACTLY — only rewrite the human-readable text between tags. Never add, remove or reorder tags. Return ONLY the rewritten text/HTML — no preface, no commentary, no markdown fences.",
      prompt: `${directives[data.action]}\n\n---\n${data.text}`,
    });
    return { text: out.trim() };
  });

const TranslateInput = z.object({
  title: z.string().min(1).max(2000),
  content: z.string().min(1).max(300000),
  sourceLanguage: z.enum(["en", "ur", "ps", "ar", "tr"]),
  targetLanguages: z.array(z.enum(["en", "ur", "ps", "ar", "tr"])).min(1).max(5),
});

export const aiTranslate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TranslateInput.parse(d))
  .handler(async ({ data }) => {
    const { callAI } = await import("./ai-gateway.server");
    const targets = data.targetLanguages.filter((t) => t !== data.sourceLanguage);
    const results: Record<string, { title: string; content: string }> = {};
    await Promise.all(
      targets.map(async (lang) => {
        const langName = LANG_NAMES[lang];
        const srcName = LANG_NAMES[data.sourceLanguage];
        const system = `You are a world-class literary translator and cultural editor. Translate from ${srcName} into ${langName}, producing native-quality prose that reads as if originally written by a native ${langName} author. Preserve meaning, tone, voice, idioms, rhetorical figures, technical terminology and educational accuracy. Adapt cultural references naturally when needed. If the input contains HTML (e.g. <p>, <h1>-<h3>, <strong>, <em>, <u>, <ul>/<ol>/<li>, <blockquote>, <hr>, <a>, <img>), preserve EVERY tag and attribute EXACTLY — translate only human-readable text between tags. Never add, remove or reorder tags. Output ONLY the translated text — no preface, no commentary, no markdown fences.`;

        // Translate title (cheap single call)
        const titleOut = (
          await callAI({
            model: AI_MODELS.quality,
            system: `Translate the user's title to ${langName}. Output ONLY the translated title, no quotes.`,
            prompt: data.title,
          })
        ).trim();

        // Chunk content along paragraph / heading boundaries
        const pieces = chunkHtml(data.content, 6000);
        const translatedPieces: string[] = [];
        for (const piece of pieces) {
          const out = await callAI({
            model: AI_MODELS.quality,
            system,
            prompt: piece,
          });
          translatedPieces.push(out.trim());
        }
        results[lang] = {
          title: titleOut || data.title,
          content: translatedPieces.join("\n\n"),
        };
      }),
    );
    return { translations: results };
  });

// Split text/HTML into chunks at natural boundaries (paragraphs, headings).
function chunkHtml(text: string, max = 6000): string[] {
  if (text.length <= max) return [text];
  // Prefer block-level HTML boundaries; fall back to blank lines.
  const parts = text.split(/(?<=<\/(?:p|h1|h2|h3|h4|li|blockquote|ul|ol|hr|div)>)\s*|\n\s*\n/);
  const out: string[] = [];
  let cur = "";
  for (const p of parts) {
    const piece = p ?? "";
    if (!piece) continue;
    if ((cur + piece).length > max && cur) {
      out.push(cur);
      cur = piece;
    } else {
      cur += piece;
    }
  }
  if (cur) out.push(cur);
  // Hard-split any oversize piece by sentences/words as a safety net.
  const safe: string[] = [];
  for (const piece of out) {
    if (piece.length <= max) {
      safe.push(piece);
      continue;
    }
    const words = piece.split(/\s+/);
    let buf = "";
    for (const w of words) {
      if ((buf + " " + w).length > max && buf) {
        safe.push(buf);
        buf = w;
      } else {
        buf = buf ? buf + " " + w : w;
      }
    }
    if (buf) safe.push(buf);
  }
  return safe;
}

// ============================================================
// AI Summaries
// ============================================================
const SummarizeInput = z.object({
  postId: z.string().uuid(),
  language: z.enum(["en", "ur", "ps", "ar", "tr"]),
  length: z.enum(["quick", "medium", "detailed"]),
});

export const aiSummarize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SummarizeInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { postId, language, length } = data;

    // 1) cached?
    const cached = await supabase
      .from("post_summaries")
      .select("content")
      .eq("post_id", postId)
      .eq("language", language)
      .eq("length", length)
      .maybeSingle();
    if (cached.data?.content) return { content: cached.data.content, cached: true };

    // 2) fetch post + translation
    const post = await supabase
      .from("posts")
      .select("id,title,content,original_language,translations:post_translations(language,title,content)")
      .eq("id", postId)
      .maybeSingle();
    if (!post.data) throw new Error("Post not found");
    const original = post.data.original_language as string;
    let source = { title: post.data.title, content: post.data.content as string };
    if (language !== original) {
      const tr = (post.data.translations as { language: string; title: string; content: string }[] | null)
        ?.find((t) => t.language === language);
      if (tr) source = { title: tr.title, content: tr.content };
    }

    const lengthSpec: Record<typeof length, string> = {
      quick: "Approximately 120-180 words, readable in under a minute. Capture the single core idea.",
      medium: "Approximately 400-600 words, readable in about 5 minutes. Include main arguments, key sections, and any important conclusions.",
      detailed: "Approximately 1200-1800 words. Cover every major concept, supporting evidence, sub-arguments and conclusions. Use clear section subheadings.",
    };
    const langName = LANG_NAMES[language];
    const { callAI } = await import("./ai-gateway.server");
    const summary = await callAI({
      model: AI_MODELS.quality,
      system: `You are an expert educator and summarizer. Write a faithful, well-structured summary in ${langName} that preserves the author's voice and intent. ${lengthSpec[length]} Use plain text with paragraph breaks. Do NOT use markdown fences.`,
      prompt: `TITLE: ${source.title}\n\nCONTENT:\n${source.content.slice(0, 80000)}`,
    });
    const finalText = summary.trim();

    // 3) cache (best-effort)
    await supabase.from("post_summaries").upsert(
      { post_id: postId, language, length, content: finalText },
      { onConflict: "post_id,language,length" },
    );
    return { content: finalText, cached: false };
  });

// ============================================================
// Knowledge Timeline
// ============================================================
const KnowledgeInput = z.object({
  postId: z.string().uuid(),
  language: z.enum(["en", "ur", "ps", "ar", "tr"]),
});

export type KnowledgePayload = {
  topic: string;
  overview: string;
  events: { year: string; title: string; description: string }[];
  people: { name: string; role: string }[];
  relatedConcepts: string[];
  exploreFurther: string[];
};

export const aiKnowledgeTimeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => KnowledgeInput.parse(d))
  .handler(async ({ data, context }): Promise<{ payload: KnowledgePayload; recommended: { id: string; title: string }[]; cached: boolean }> => {
    const { supabase } = context;
    const { postId, language } = data;

    const cached = await supabase
      .from("post_knowledge")
      .select("payload")
      .eq("post_id", postId)
      .eq("language", language)
      .maybeSingle();

    let payload: KnowledgePayload;
    if (cached.data?.payload) {
      payload = cached.data.payload as KnowledgePayload;
    } else {
      const post = await supabase
        .from("posts")
        .select("id,title,content,original_language,category,translations:post_translations(language,title,content)")
        .eq("id", postId)
        .maybeSingle();
      if (!post.data) throw new Error("Post not found");
      let source = { title: post.data.title, content: post.data.content as string };
      if (language !== post.data.original_language) {
        const tr = (post.data.translations as { language: string; title: string; content: string }[] | null)
          ?.find((t) => t.language === language);
        if (tr) source = { title: tr.title, content: tr.content };
      }
      const langName = LANG_NAMES[language];
      const { callAI } = await import("./ai-gateway.server");
      const raw = await callAI({
        model: AI_MODELS.quality,
        system: `You build the "Knowledge Timeline" side panel for a multilingual reading platform. Given an article/book excerpt, produce connected knowledge in ${langName}. Output STRICT JSON only — no markdown fences, no preface. JSON shape:\n{\n  "topic": string,\n  "overview": string (2-3 sentences),\n  "events": [{"year": string, "title": string, "description": string}] (max 8, chronological if applicable; otherwise key milestones or concepts),\n  "people": [{"name": string, "role": string}] (max 6 — key figures, authors, or thinkers),\n  "relatedConcepts": string[] (max 8 — short noun phrases for further exploration),\n  "exploreFurther": string[] (max 5 — search-friendly topic phrases beyond the current text)\n}\nEvery string is in ${langName}. Be accurate, neutral, educational. Empty arrays are acceptable when truly nothing fits.`,
        prompt: `TITLE: ${source.title}\nCATEGORY: ${post.data.category ?? "general"}\n\nCONTENT:\n${(source.content || "").slice(0, 40000)}`,
      });
      const cleaned = raw
        .trim()
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/i, "")
        .trim();
      try {
        payload = JSON.parse(cleaned);
      } catch {
        payload = {
          topic: source.title,
          overview: cleaned.slice(0, 400),
          events: [],
          people: [],
          relatedConcepts: [],
          exploreFurther: [],
        };
      }
      await supabase.from("post_knowledge").upsert(
        { post_id: postId, language, payload },
        { onConflict: "post_id,language" },
      );
    }

    // Search related Rosellea posts by topic + concepts (title ilike)
    const terms = [payload.topic, ...(payload.relatedConcepts ?? [])]
      .filter(Boolean)
      .slice(0, 5);
    const recommended: { id: string; title: string }[] = [];
    if (terms.length > 0) {
      const orExpr = terms.map((t) => `title.ilike.%${t.replace(/[%,]/g, "")}%`).join(",");
      const rel = await supabase
        .from("posts")
        .select("id,title")
        .neq("id", postId)
        .or(orExpr)
        .limit(6);
      if (rel.data) recommended.push(...rel.data);
    }

    return { payload, recommended, cached: !!cached.data };
  });

// ============================================================
// AI Assistant — load history + persist message
// ============================================================
const HistoryInput = z.object({ postId: z.string().uuid() });
export const loadAssistantMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => HistoryInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("assistant_messages")
      .select("id,role,content,created_at")
      .eq("post_id", data.postId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });
    return rows ?? [];
  });

const ClearInput = z.object({ postId: z.string().uuid() });
export const clearAssistantMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ClearInput.parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("assistant_messages")
      .delete()
      .eq("post_id", data.postId)
      .eq("user_id", context.userId);
    return { ok: true };
  });

// ============================================================
// Podcast: chunk the post content for sequential TTS
// ============================================================
const PodcastInput = z.object({
  postId: z.string().uuid(),
  language: z.enum(["en", "ur", "ps", "ar", "tr"]),
});
export const aiPodcastChunks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PodcastInput.parse(d))
  .handler(async ({ data, context }) => {
    const post = await context.supabase
      .from("posts")
      .select("title,content,original_language,translations:post_translations(language,title,content)")
      .eq("id", data.postId)
      .maybeSingle();
    if (!post.data) throw new Error("Post not found");
    let source = { title: post.data.title, content: post.data.content as string };
    if (data.language !== post.data.original_language) {
      const tr = (post.data.translations as { language: string; title: string; content: string }[] | null)
        ?.find((t) => t.language === data.language);
      if (tr) source = { title: tr.title, content: tr.content };
    }
    // Strip HTML to plain text for natural speech
    const plain = (source.content || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|h[1-6]|li|blockquote|div)>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const full = `${source.title}.\n\n${plain}`;
    // ~400 words per chunk
    const sentences = full.match(/[^.!?\n]+[.!?\n]+/g) ?? [full];
    const chunks: string[] = [];
    let cur = "";
    const wc = (s: string) => (s.match(/\S+/g) ?? []).length;
    for (const s of sentences) {
      if (cur && wc(cur) + wc(s) > 400) {
        chunks.push(cur.trim());
        cur = s;
      } else {
        cur += s;
      }
    }
    if (cur.trim()) chunks.push(cur.trim());
    return { chunks, title: source.title };
  });
