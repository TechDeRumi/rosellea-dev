import DOMPurify from "dompurify";

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'",
};

/** Convert stored HTML (or plain text) into clean readable preview text. SSR-safe. */
export function htmlToText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>|<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(nbsp|amp|lt|gt|quot|#39|apos);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export function previewText(excerpt: string | null | undefined, content: string | null | undefined, max = 220): string {
  const fromExcerpt = htmlToText(excerpt);
  if (fromExcerpt) return fromExcerpt;
  const t = htmlToText(content);
  return t.length > max ? t.slice(0, max).trimEnd() + "…" : t;
}

/** Sanitize rich-text HTML for safe rendering; drops empty paragraphs. */
export function sanitizeHtml(html: string): string {
  const cleaned = html.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "");
  if (typeof window === "undefined") {
    return cleaned
      .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, "")
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, "");
  }
  return DOMPurify.sanitize(cleaned, { ADD_ATTR: ["target"] });
}
