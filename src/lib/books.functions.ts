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

const Input = z.object({
  postId: z.string().uuid(),
  language: z.enum(["en", "ur", "ps", "ar", "tr"]),
});

// Chunk text into ~6k character pieces along paragraph boundaries.
function chunk(text: string, max = 6000): string[] {
  const paras = text.split(/\n\s*\n/);
  const out: string[] = [];
  let cur = "";
  for (const p of paras) {
    if ((cur + "\n\n" + p).length > max && cur) {
      out.push(cur);
      cur = p;
    } else {
      cur = cur ? cur + "\n\n" + p : p;
    }
  }
  if (cur) out.push(cur);
  return out;
}

export const getBookText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { postId, language } = data;

    // 1) Return cached translation if present.
    const cached = await supabase
      .from("post_translations")
      .select("title,content")
      .eq("post_id", postId)
      .eq("language", language)
      .maybeSingle();
    if (cached.data?.content) {
      return { title: cached.data.title, content: cached.data.content, cached: true };
    }

    // 2) Load the post.
    const post = await supabase
      .from("posts")
      .select("id,type,title,pdf_url,original_language,author_id")
      .eq("id", postId)
      .maybeSingle();
    if (post.error || !post.data) throw new Error("Book not found");
    if (post.data.type !== "book") throw new Error("Not a book");
    if (!post.data.pdf_url) throw new Error("This book has no PDF");
    const original = post.data.original_language as "en" | "ur" | "ps" | "ar" | "tr";

    // 3) Need original text first. Try cached original row.
    let originalText: string | null = null;
    let originalTitle = post.data.title;
    if (original !== language) {
      const origRow = await supabase
        .from("post_translations")
        .select("title,content")
        .eq("post_id", postId)
        .eq("language", original)
        .maybeSingle();
      if (origRow.data?.content) {
        originalText = origRow.data.content;
        originalTitle = origRow.data.title;
      }
    }

    if (!originalText) {
      // 4) Download PDF and extract text.
      const res = await fetch(post.data.pdf_url);
      if (!res.ok) throw new Error("Could not download PDF");
      const buf = new Uint8Array(await res.arrayBuffer());
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(buf);
      const { text } = await extractText(pdf, { mergePages: true });
      originalText = (Array.isArray(text) ? text.join("\n\n") : text).trim();
      if (!originalText) throw new Error("No readable text in this PDF");

      // Persist original-language extraction so we never re-extract.
      await supabase.from("post_translations").upsert(
        { post_id: postId, language: original as "en" | "ur" | "ps" | "ar" | "tr", title: originalTitle, content: originalText },
        { onConflict: "post_id,language" },
      );
      if (language === original) {
        return { title: originalTitle, content: originalText, cached: false };
      }
    }

    // 5) Translate to requested language (chunked).
    const { callAI } = await import("./ai-gateway.server");
    const target = LANG_NAMES[language];
    const src = LANG_NAMES[original];

    const titleOut = await callAI({
      system: `Translate to ${target}. Output only the translated title, no quotes, no commentary.`,
      prompt: `Translate this book title from ${src} to ${target}:\n${originalTitle}`,
    });

    const pieces = chunk(originalText, 6000);
    const translated: string[] = [];
    for (const piece of pieces) {
      const out = await callAI({
        system: `You are a master translator. Translate the user's text from ${src} into ${target}, preserving meaning, tone and paragraph breaks. Output ONLY the translated text, no preface, no markdown.`,
        prompt: piece,
      });
      translated.push(out.trim());
    }
    const finalContent = translated.join("\n\n");
    const finalTitle = titleOut.trim() || originalTitle;

    await supabase.from("post_translations").upsert(
      { post_id: postId, language: language as "en" | "ur" | "ps" | "ar" | "tr", title: finalTitle, content: finalContent },
      { onConflict: "post_id,language" },
    );

    return { title: finalTitle, content: finalContent, cached: false };
  });

// ============================================================
// analyzeBook — extract PDF, run AI, populate chapters/flashcards/quizzes
// ============================================================
const AnalyzeInput = z.object({ postId: z.string().uuid(), force: z.boolean().optional() });

type AnalyzeResult = {
  summary: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  reading_minutes: number;
  keywords: string[];
  topics: string[];
  chapters: { title: string; summary: string; content: string; keywords: string[] }[];
  flashcards: { question: string; answer: string }[];
  quizzes: {
    question: string;
    options: string[];
    correct_index: number;
    explanation: string;
  }[];
};

export const analyzeBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AnalyzeInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { postId, force } = data;

    const post = await supabase
      .from("posts")
      .select("id,type,title,pdf_url,original_language,author_id,ai_status")
      .eq("id", postId)
      .maybeSingle();
    if (post.error || !post.data) throw new Error("Book not found");
    if (post.data.type !== "book") throw new Error("Not a book");
    if (!post.data.pdf_url) throw new Error("This book has no PDF");
    if (post.data.author_id !== userId) {
      // only author can (re)trigger analysis
      throw new Error("Only the author can analyze this book");
    }
    if (!force && post.data.ai_status === "ready") {
      return { status: "ready" as const, cached: true };
    }

    await supabase.from("posts").update({ ai_status: "analyzing", ai_error: null }).eq("id", postId);

    try {
      // 1) Download & extract
      const res = await fetch(post.data.pdf_url);
      if (!res.ok) throw new Error("Could not download PDF");
      const buf = new Uint8Array(await res.arrayBuffer());
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(buf);
      const { text } = await extractText(pdf, { mergePages: true });
      const bookText = (Array.isArray(text) ? text.join("\n\n") : text).trim();
      if (!bookText) throw new Error("No readable text in this PDF");

      // Cache original-language extraction for future translation calls.
      await supabase.from("post_translations").upsert(
        {
          post_id: postId,
          language: post.data.original_language as "en" | "ur" | "ps" | "ar" | "tr",
          title: post.data.title,
          content: bookText,
        },
        { onConflict: "post_id,language" },
      );

      // 2) Ask AI for structured JSON. Cap payload for cost/time.
      const excerpt = bookText.slice(0, 60000);
      const langName = LANG_NAMES[post.data.original_language] ?? "English";
      const { callAI } = await import("./ai-gateway.server");
      const raw = await callAI({
        model: AI_MODELS.quality,
        system:
          `You analyze books for Rosellea, a premium multilingual reading platform. ` +
          `Read the book excerpt below and output STRICT JSON only — no markdown fences, no preface, no trailing prose. ` +
          `All strings in ${langName}. JSON shape:\n` +
          `{\n` +
          `  "summary": string (250-450 words, faithful overview),\n` +
          `  "difficulty": "beginner" | "intermediate" | "advanced",\n` +
          `  "reading_minutes": integer (estimate to read the full book),\n` +
          `  "keywords": string[] (10-20 short noun phrases),\n` +
          `  "topics": string[] (5-10 broader subject areas),\n` +
          `  "chapters": [{ "title": string, "summary": string (2-4 sentences), "content": string (300-800 words drawn from the excerpt for this chapter), "keywords": string[] (up to 6) }] (6-12 items, follow the book's own chapter/section structure when detectable, else create logical divisions),\n` +
          `  "flashcards": [{ "question": string, "answer": string }] (12-20 items, cover the most important ideas),\n` +
          `  "quizzes": [{ "question": string, "options": string[4], "correct_index": integer 0..3, "explanation": string }] (6-10 items)\n` +
          `}\n` +
          `Be accurate, educational and grounded ONLY in the provided excerpt.`,
        prompt: `TITLE: ${post.data.title}\n\nEXCERPT (may be truncated):\n${excerpt}`,
      });

      const cleaned = raw
        .trim()
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/i, "")
        .trim();

      let parsed: AnalyzeResult;
      try {
        parsed = JSON.parse(cleaned) as AnalyzeResult;
      } catch {
        throw new Error("AI returned malformed analysis JSON");
      }

      const chapters = Array.isArray(parsed.chapters) ? parsed.chapters : [];
      const flashcards = Array.isArray(parsed.flashcards) ? parsed.flashcards : [];
      const quizzes = Array.isArray(parsed.quizzes) ? parsed.quizzes : [];

      // 3) Replace previous rows.
      await supabase.from("book_chapters").delete().eq("post_id", postId);
      await supabase.from("book_flashcards").delete().eq("post_id", postId);
      await supabase.from("book_quizzes").delete().eq("post_id", postId);

      if (chapters.length > 0) {
        await supabase.from("book_chapters").insert(
          chapters.slice(0, 20).map((c, i) => ({
            post_id: postId,
            idx: i,
            title: (c.title || `Chapter ${i + 1}`).slice(0, 240),
            summary: (c.summary || "").slice(0, 4000),
            content: (c.content || "").slice(0, 40000),
            keywords: Array.isArray(c.keywords) ? c.keywords.slice(0, 10) : [],
          })),
        );
      }
      if (flashcards.length > 0) {
        await supabase.from("book_flashcards").insert(
          flashcards.slice(0, 40).map((f) => ({
            post_id: postId,
            language: post.data!.original_language,
            question: (f.question || "").slice(0, 1000),
            answer: (f.answer || "").slice(0, 4000),
          })),
        );
      }
      if (quizzes.length > 0) {
        await supabase.from("book_quizzes").insert(
          quizzes.slice(0, 20).map((q) => ({
            post_id: postId,
            language: post.data!.original_language,
            question: (q.question || "").slice(0, 1000),
            options: Array.isArray(q.options) ? q.options.slice(0, 4) : [],
            correct_index: Math.max(0, Math.min(3, Number(q.correct_index) || 0)),
            explanation: (q.explanation || "").slice(0, 2000),
          })),
        );
      }

      // 4) Update posts row.
      await supabase
        .from("posts")
        .update({
          ai_status: "ready",
          ai_metadata: {
            summary: parsed.summary ?? "",
            chapter_count: chapters.length,
            flashcard_count: flashcards.length,
            quiz_count: quizzes.length,
            analyzed_at: new Date().toISOString(),
          } as unknown as never,
          reading_minutes: Math.max(1, Math.min(6000, Number(parsed.reading_minutes) || 30)),
          difficulty: ["beginner", "intermediate", "advanced"].includes(parsed.difficulty)
            ? parsed.difficulty
            : "intermediate",
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 30) : [],
          topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 15) : [],
        })
        .eq("id", postId);

      return { status: "ready" as const, cached: false };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Analysis failed";
      await supabase
        .from("posts")
        .update({ ai_status: "failed", ai_error: message.slice(0, 500) })
        .eq("id", postId);
      throw new Error(message);
    }
  });

// ============================================================
// getBookAnalysis — read chapters + flashcards + quizzes + status
// ============================================================
const GetAnalysisInput = z.object({ postId: z.string().uuid() });
export const getBookAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GetAnalysisInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { postId } = data;
    const [post, chapters, flashcards, quizzes] = await Promise.all([
      supabase
        .from("posts")
        .select("ai_status,ai_error,ai_metadata,reading_minutes,difficulty,keywords,topics")
        .eq("id", postId)
        .maybeSingle(),
      supabase
        .from("book_chapters")
        .select("id,idx,title,summary,keywords")
        .eq("post_id", postId)
        .order("idx", { ascending: true }),
      supabase
        .from("book_flashcards")
        .select("id,question,answer")
        .eq("post_id", postId),
      supabase
        .from("book_quizzes")
        .select("id,question,options,correct_index,explanation")
        .eq("post_id", postId),
    ]);
    return {
      status: (post.data?.ai_status ?? "pending") as string,
      error: post.data?.ai_error ?? null,
      metadata: post.data?.ai_metadata ?? null,
      reading_minutes: post.data?.reading_minutes ?? null,
      difficulty: post.data?.difficulty ?? null,
      keywords: post.data?.keywords ?? [],
      topics: post.data?.topics ?? [],
      chapters: chapters.data ?? [],
      flashcards: flashcards.data ?? [],
      quizzes: quizzes.data ?? [],
    };
  });

// ============================================================
// Reader personal data — notes, highlights, progress
// ============================================================
const NoteUpsertInput = z.object({
  postId: z.string().uuid(),
  id: z.string().uuid().optional(),
  chapterId: z.string().uuid().nullable().optional(),
  body: z.string().min(1).max(20000),
});
export const upsertBookNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => NoteUpsertInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.id) {
      const { data: row, error } = await supabase
        .from("book_notes")
        .update({ body: data.body, chapter_id: data.chapterId ?? null })
        .eq("id", data.id)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw error;
      return row;
    }
    const { data: row, error } = await supabase
      .from("book_notes")
      .insert({
        post_id: data.postId,
        user_id: userId,
        chapter_id: data.chapterId ?? null,
        body: data.body,
      })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

const NoteListInput = z.object({ postId: z.string().uuid() });
export const listBookNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => NoteListInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("book_notes")
      .select("id,body,chapter_id,updated_at")
      .eq("post_id", data.postId)
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    return rows ?? [];
  });

const NoteDeleteInput = z.object({ id: z.string().uuid() });
export const deleteBookNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => NoteDeleteInput.parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("book_notes")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });

const ProgressInput = z.object({
  postId: z.string().uuid(),
  chapterIdx: z.number().int().min(0).max(1000).optional(),
  scrollRatio: z.number().min(0).max(1).optional(),
  percent: z.number().int().min(0).max(100).optional(),
});
export const saveReadingProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProgressInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("reading_progress")
      .upsert(
        {
          user_id: userId,
          post_id: data.postId,
          chapter_idx: data.chapterIdx ?? null,
          scroll_ratio: data.scrollRatio ?? 0,
          percent: data.percent ?? 0,
        },
        { onConflict: "user_id,post_id" },
      );
    return { ok: true };
  });