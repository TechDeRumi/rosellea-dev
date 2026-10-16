import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus, Link as LinkIcon, Image as ImageIcon,
  AlignLeft, AlignCenter, AlignRight, Undo2, Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (html: string) => void;
  userId: string | undefined;
  rtl?: boolean;
  placeholder?: string;
  minHeight?: number;
};

export function RichTextEditor({ value, onChange, userId, rtl, placeholder, minHeight = 400 }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const externalValueRef = useRef<string>(value || "");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      Image.configure({ HTMLAttributes: { class: "rounded-xl border border-border my-4 max-w-full h-auto" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: placeholder ?? "Start writing…" }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "prose-rte focus:outline-none",
        dir: rtl ? "rtl" : "ltr",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      externalValueRef.current = html;
      onChange(html);
    },
  });

  // Keep dir attribute in sync when language changes
  useEffect(() => {
    if (!editor) return;
    editor.view.dom.setAttribute("dir", rtl ? "rtl" : "ltr");
  }, [rtl, editor]);

  // Sync external value (e.g. loading existing post). Skip echoes from our own onUpdate.
  useEffect(() => {
    if (!editor) return;
    const incoming = value || "";
    if (incoming === externalValueRef.current) return;
    externalValueRef.current = incoming;
    editor.commands.setContent(incoming);
  }, [value, editor]);

  if (!editor) return null;

  async function uploadImage(file: File) {
    if (!userId) return toast.error("Sign in to upload images");
    if (!/^image\/(jpeg|jpg|png|webp|gif)$/.test(file.type)) {
      return toast.error("Use JPG, PNG, WEBP or GIF");
    }
    if (file.size > 10 * 1024 * 1024) return toast.error("Max 10 MB");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const t = toast.loading("Uploading image…");
    try {
      const { error } = await supabase.storage.from("article-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = await supabase.storage
        .from("article-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      const url = data?.signedUrl;
      if (!url) throw new Error("Could not sign URL");
      editor!.chain().focus().setImage({ src: url, alt: file.name }).run();
      toast.success("Image inserted", { id: t });
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed", { id: t });
    }
  }

  function promptLink() {
    const prev = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL (leave empty to remove)", prev ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor!.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Toolbar editor={editor} onPickImage={() => fileInputRef.current?.click()} onLink={promptLink} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadImage(f);
          e.target.value = "";
        }}
      />
      <div className="px-5 py-4" style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor, onPickImage, onLink }: { editor: Editor; onPickImage: () => void; onLink: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-background/60 px-2 py-1.5">
      <Btn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="Bold"><Bold className="h-4 w-4" /></Btn>
      <Btn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic"><Italic className="h-4 w-4" /></Btn>
      <Btn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} label="Underline"><UnderlineIcon className="h-4 w-4" /></Btn>
      <Btn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} label="Strikethrough"><Strikethrough className="h-4 w-4" /></Btn>
      <Sep />
      <Btn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} label="Heading 1"><Heading1 className="h-4 w-4" /></Btn>
      <Btn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="Heading 2"><Heading2 className="h-4 w-4" /></Btn>
      <Btn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="Heading 3"><Heading3 className="h-4 w-4" /></Btn>
      <Sep />
      <Btn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Bullet list"><List className="h-4 w-4" /></Btn>
      <Btn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="Numbered list"><ListOrdered className="h-4 w-4" /></Btn>
      <Btn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Quote"><Quote className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} label="Divider"><Minus className="h-4 w-4" /></Btn>
      <Sep />
      <Btn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} label="Align left"><AlignLeft className="h-4 w-4" /></Btn>
      <Btn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} label="Align center"><AlignCenter className="h-4 w-4" /></Btn>
      <Btn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} label="Align right"><AlignRight className="h-4 w-4" /></Btn>
      <Sep />
      <Btn active={editor.isActive("link")} onClick={onLink} label="Link"><LinkIcon className="h-4 w-4" /></Btn>
      <Btn onClick={onPickImage} label="Insert image"><ImageIcon className="h-4 w-4" /></Btn>
      <Sep />
      <Btn onClick={() => editor.chain().focus().undo().run()} label="Undo"><Undo2 className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} label="Redo"><Redo2 className="h-4 w-4" /></Btn>
    </div>
  );
}

function Btn({ children, onClick, active, label }: { children: React.ReactNode; onClick: () => void; active?: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
        active && "bg-primary/15 text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 h-5 w-px bg-border" aria-hidden />;
}