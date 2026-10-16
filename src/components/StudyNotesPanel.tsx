import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listBookNotes, upsertBookNote, deleteBookNote } from "@/lib/books.functions";
import { Loader2, Notebook, Trash2, Plus, Save } from "lucide-react";
import { LANG_MAP, type LanguageCode } from "@/lib/constants";
import { toast } from "sonner";

type Note = { id: string; body: string; chapter_id: string | null; updated_at: string };

export function StudyNotesPanel({ postId, language }: { postId: string; language: LanguageCode }) {
  const list = useServerFn(listBookNotes);
  const upsert = useServerFn(upsertBookNote);
  const remove = useServerFn(deleteBookNote);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = () => {
    setLoading(true);
    list({ data: { postId } })
      .then((r) => setNotes(r as Note[]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function save() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await upsert({
        data: { postId, id: editingId ?? undefined, body: draft.trim() },
      });
      setDraft("");
      setEditingId(null);
      refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save note");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    await remove({ data: { id } });
    refresh();
  }

  const dir = LANG_MAP[language].rtl ? "rtl" : "ltr";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
        <Notebook className="h-4 w-4 text-primary" /> Study notes
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4" dir={dir}>
        <div className="mb-4 rounded-2xl border border-border bg-card p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={editingId ? "Edit note…" : "Add a note for this book…"}
            className="min-h-[100px] w-full resize-y rounded-xl border border-transparent bg-background p-2 text-sm focus:border-primary focus:outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            {editingId && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setDraft("");
                }}
                className="rounded-full px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            )}
            <button
              onClick={save}
              disabled={!draft.trim() || saving}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : editingId ? <Save className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              {editingId ? "Update" : "Add note"}
            </button>
          </div>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading notes…
          </div>
        )}
        {!loading && notes.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
            No notes yet. Anything you write is private to you.
          </div>
        )}
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="group rounded-2xl border border-border bg-card p-3">
              <p className="whitespace-pre-wrap text-sm text-foreground">{n.body}</p>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{new Date(n.updated_at).toLocaleString()}</span>
                <div className="flex gap-3 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => {
                      setEditingId(n.id);
                      setDraft(n.body);
                    }}
                    className="hover:text-foreground"
                  >
                    Edit
                  </button>
                  <button onClick={() => del(n.id)} className="inline-flex items-center gap-1 hover:text-red-500">
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}