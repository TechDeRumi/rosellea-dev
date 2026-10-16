import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { htmlToText } from "@/lib/html";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES, CATEGORIES, type LanguageCode, LANG_MAP } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { aiAssistWriting, aiTranslate } from "@/lib/ai.functions";
import { analyzeBook } from "@/lib/books.functions";
import { Loader2, Sparkles, Wand2, Languages, Upload, Save, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/RichTextEditor";

const searchSchema = z.object({ edit: z.string().optional() });

export const Route = createFileRoute("/_authenticated/write")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Write — Rosellea" },
      { name: "description", content: "Write an article, story or upload a book. Auto-translated into 5 languages." },
    ],
  }),
  component: WritePage,
});

type Type = "article" | "story" | "book";

function WritePage() {
  const { edit } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [type, setType] = useState<Type>("article");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [sourceLanguage, setSourceLanguage] = useState<LanguageCode>("en");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState<string | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [postId, setPostId] = useState<string | undefined>(edit);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const dirtyRef = useRef(false);
  const lastSerializedRef = useRef<string>("");

  const assist = useServerFn(aiAssistWriting);
  const translate = useServerFn(aiTranslate);
  const runAnalyze = useServerFn(analyzeBook);

  // Load existing post if editing
  useEffect(() => {
    if (!edit) return;
    supabase
      .from("posts")
      .select("*")
      .eq("id", edit)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setType(data.type);
        setTitle(data.title);
        setContent(data.content);
        setExcerpt(data.excerpt ?? "");
        setCategory(data.category);
        setSourceLanguage(data.original_language);
        setExistingPdfUrl(data.pdf_url);
        setExistingCoverUrl(data.cover_image_url);
        setPostId(edit);
      });
  }, [edit]);

  // Load local autosave for new posts
  useEffect(() => {
    if (edit) return;
    try {
      const raw = localStorage.getItem("rosellea:draft:new");
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.title) setTitle(d.title);
      if (d.content) setContent(d.content);
      if (d.excerpt) setExcerpt(d.excerpt);
      if (d.category) setCategory(d.category);
      if (d.sourceLanguage) setSourceLanguage(d.sourceLanguage);
      if (d.type) setType(d.type);
    } catch {}
  }, [edit]);

  // Mark dirty whenever editable fields change
  useEffect(() => {
    dirtyRef.current = true;
  }, [title, content, excerpt, category, sourceLanguage, type]);

  // Auto-save (local always; server every ~10s when signed-in & we have an existing post row)
  useEffect(() => {
    const id = window.setInterval(async () => {
      if (!dirtyRef.current) return;
      const snapshot = { type, title, content, excerpt, category, sourceLanguage };
      const serialized = JSON.stringify(snapshot);
      if (serialized === lastSerializedRef.current) return;
      lastSerializedRef.current = serialized;
      // Always persist locally
      try { localStorage.setItem(edit ? `rosellea:draft:${edit}` : "rosellea:draft:new", serialized); } catch {}
      // Persist to DB only if we already have a row (avoid spamming inserts)
      if (postId && user) {
        const { error } = await supabase
          .from("posts")
          .update({
            type,
            category,
            title: title.trim() || "Untitled draft",
            content,
            excerpt: excerpt.trim() || null,
            original_language: sourceLanguage,
          })
          .eq("id", postId);
        if (!error) setSavedAt(new Date());
      } else {
        setSavedAt(new Date());
      }
      dirtyRef.current = false;
    }, 4000);
    return () => window.clearInterval(id);
  }, [postId, user, type, title, content, excerpt, category, sourceLanguage, edit]);

  type AssistAction = "improve" | "grammar" | "expand" | "simplify" | "formal" | "storytelling" | "academic";
  async function runAssist(action: AssistAction) {
    if (!content.trim()) return toast.error("Write something first");
    setBusy(action);
    try {
      const res = await assist({ data: { text: content, action } });
      setContent(res.text);
      toast.success("Updated by AI");
    } catch (e: any) {
      toast.error(e.message ?? "AI failed");
    } finally {
      setBusy(null);
    }
  }

  async function uploadFile(file: File, bucket: "covers" | "books") {
    if (!user) throw new Error("Not signed in");
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    return data?.signedUrl ?? null;
  }

  async function saveDraft() {
    if (!user) return;
    if (!title.trim() && !content.trim()) return toast.error("Add a title or some content first");
    setBusy("draft");
    try {
      let coverUrl = existingCoverUrl;
      let pdfUrl = existingPdfUrl;
      if (coverFile) coverUrl = await uploadFile(coverFile, "covers");
      if (pdfFile) pdfUrl = await uploadFile(pdfFile, "books");
      const payload = {
        author_id: user.id,
        type,
        category,
        title: title.trim() || "Untitled draft",
        content,
        excerpt: excerpt.trim() || null,
        cover_image_url: coverUrl,
        pdf_url: pdfUrl,
        original_language: sourceLanguage,
        published: false,
      };
      if (postId) {
        const { error } = await supabase.from("posts").update(payload).eq("id", postId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("posts").insert(payload).select("id").single();
        if (error) throw error;
        setPostId(data.id);
        try { localStorage.removeItem("rosellea:draft:new"); } catch {}
      }
      setSavedAt(new Date());
      toast.success("Draft saved — you can come back any time");
    } catch (e: any) {
      toast.error(e.message ?? "Could not save draft");
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (!user) return;
    if (!title.trim()) return toast.error("Title is required");
    if (type !== "book" && !content.trim()) return toast.error("Content is required");
    if (type === "book" && !pdfFile && !existingPdfUrl) return toast.error("Please attach a PDF");

    setBusy("publish");
    try {
      let coverUrl = existingCoverUrl;
      let pdfUrl = existingPdfUrl;
      if (coverFile) coverUrl = await uploadFile(coverFile, "covers");
      if (pdfFile) pdfUrl = await uploadFile(pdfFile, "books");

      const payload = {
        author_id: user.id,
        type,
        category,
        title: title.trim(),
        content: content,
        excerpt: htmlToText(excerpt) || htmlToText(content).slice(0, 240) || null,
        cover_image_url: coverUrl,
        pdf_url: pdfUrl,
        original_language: sourceLanguage,
        published: true,
      };

      let currentId = postId;
      if (currentId) {
        const { error } = await supabase.from("posts").update(payload).eq("id", currentId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("posts").insert(payload).select("id").single();
        if (error) throw error;
        currentId = data.id;
        setPostId(currentId);
      }
      try { localStorage.removeItem(edit ? `rosellea:draft:${edit}` : "rosellea:draft:new"); } catch {}

      // Generate translations (only if there is text content)
      if (currentId && content.trim() && type !== "book") {
        toast.message("Translating into all languages…");
        const targets = LANGUAGES.map((l) => l.code).filter((c) => c !== sourceLanguage);
        try {
          const { translations } = await translate({
            data: {
              title: title.trim(),
              content,
              sourceLanguage,
              targetLanguages: targets,
            },
          });
          const rows = Object.entries(translations).map(([language, t]) => ({
            post_id: currentId!,
            language: language as LanguageCode,
            title: t.title,
            content: t.content,
          }));
          // remove old translations on edit
          if (edit) await supabase.from("post_translations").delete().eq("post_id", currentId);
          if (rows.length) await supabase.from("post_translations").insert(rows);
        } catch (e: any) {
          toast.error("Published, but translation failed: " + (e.message ?? "AI error"));
        }
      }

      // For books: kick off AI analysis in the background.
      if (currentId && type === "book") {
        toast.message("AI is analyzing your book — chapters, flashcards & quiz will appear shortly.");
        runAnalyze({ data: { postId: currentId, force: true } }).catch((e: any) => {
          toast.error("Analysis failed: " + (e?.message ?? "AI error"));
        });
      }

      toast.success(edit ? "Updated" : "Published");
      navigate({ to: "/post/$id", params: { id: currentId! } });
    } catch (e: any) {
      toast.error(e.message ?? "Could not publish");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{edit ? "Edit content" : "Create"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Write once. We translate it into English, Urdu, Pashto, Arabic and Turkish for every reader.
      </p>

      <div className="mt-6 flex gap-2 rounded-full border border-border bg-card p-1">
        {(["article", "story", "book"] as Type[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={
              "flex-1 rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors " +
              (type === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary/60")
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Original language</Label>
            <Select value={sourceLanguage} onValueChange={(v) => setSourceLanguage(v as LanguageCode)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.flag} {l.name} ({l.native})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cover */}
        <div>
          <Label>Cover image (optional)</Label>
          <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground hover:bg-secondary/40">
            <Upload className="h-4 w-4" />
            {coverFile?.name || (existingCoverUrl ? "Replace cover" : "Click to upload an image")}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {/* Book PDF */}
        {type === "book" && (
          <div>
            <Label>Book PDF</Label>
            <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground hover:bg-secondary/40">
              <Upload className="h-4 w-4" />
              {pdfFile?.name || (existingPdfUrl ? "Replace PDF" : "Click to upload a PDF")}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        )}

        {/* Content */}
        {type !== "book" && (
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="content">{type === "article" ? "Article" : "Story"}</Label>
              <div className="flex flex-wrap gap-1">
                <AIBtn label="Improve" icon={<Sparkles />} onClick={() => runAssist("improve")} loading={busy === "improve"} />
                <AIBtn label="Grammar" icon={<Wand2 />} onClick={() => runAssist("grammar")} loading={busy === "grammar"} />
                <AIBtn label="Expand" onClick={() => runAssist("expand")} loading={busy === "expand"} />
                <AIBtn label="Simplify" onClick={() => runAssist("simplify")} loading={busy === "simplify"} />
                <AIBtn label="Story tone" onClick={() => runAssist("storytelling")} loading={busy === "storytelling"} />
              </div>
            </div>
            <div className="mt-1">
              <RichTextEditor
                value={content}
                onChange={setContent}
                userId={user?.id}
                rtl={!!LANG_MAP[sourceLanguage]?.rtl}
                placeholder={type === "article" ? "Write your article…" : "Once upon a time…"}
                minHeight={460}
              />
            </div>
          </div>
        )}

        {(type === "book" || type === "story" || type === "article") && (
          <div>
            <Label htmlFor="excerpt">Excerpt (optional)</Label>
            <Textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className="mt-1 min-h-[80px] rounded-2xl"
              placeholder="A short preview readers will see in the feed."
            />
          </div>
        )}

        {type === "book" && (
          <div>
            <Label>Book description</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1 min-h-[160px] rounded-2xl"
              placeholder="Describe the book — this is what will be translated and shown to readers."
            />
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button variant="hero" size="lg" disabled={!!busy} onClick={publish}>
            {busy === "publish" ? <Loader2 className="animate-spin" /> : <Languages />}
            {edit ? "Update & re-translate" : "Publish & translate"}
          </Button>
          <Button variant="outline" size="lg" disabled={!!busy} onClick={saveDraft}>
            {busy === "draft" ? <Loader2 className="animate-spin" /> : <Save />}
            Save draft
          </Button>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            {savedAt ? (
              <><FileCheck2 className="h-3.5 w-3.5 text-emerald-600" /> Auto-saved at {savedAt.toLocaleTimeString()}</>
            ) : (
              <>Auto-save runs every few seconds while you write.</>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

function AIBtn({ label, icon, onClick, loading }: { label: string; icon?: React.ReactNode; onClick: () => void; loading: boolean }) {
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onClick} disabled={loading} className="h-7 px-2 text-[11px]">
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : icon} {label}
    </Button>
  );
}
