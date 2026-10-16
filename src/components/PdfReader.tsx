import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Loader2, Maximize2, Minimize2, RotateCw, ZoomIn, ZoomOut } from "lucide-react";

type PDFDoc = { numPages: number; getPage: (n: number) => Promise<any>; destroy: () => void };

/**
 * In-app PDF reader built on PDF.js. Fetches the file as bytes (never navigates
 * to the URL, so no browser download is triggered) and renders pages lazily.
 */
export function PdfReader({ url, title, storageKey }: { url: string; title: string; storageKey: string }) {
  const [doc, setDoc] = useState<PDFDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [scale, setScale] = useState(1);
  const [page, setPage] = useState(1);
  const [full, setFull] = useState(false);
  const [baseWidth, setBaseWidth] = useState(800);
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const progressKey = `rosellea-progress-${storageKey}`;

  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDoc | null = null;
    setDoc(null);
    setError(null);
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Could not load the book (HTTP ${res.status}).`);
        const data = new Uint8Array(await res.arrayBuffer());
        loaded = (await pdfjs.getDocument({ data }).promise) as unknown as PDFDoc;
        if (!cancelled) setDoc(loaded);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not open this book.");
      }
    })();
    return () => {
      cancelled = true;
      loaded?.destroy();
    };
  }, [url, attempt]);

  // Measure available width
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBaseWidth(Math.min(el.clientWidth - 24, 900)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [full]);

  // Restore saved progress once loaded
  useEffect(() => {
    if (!doc) return;
    const saved = Number(localStorage.getItem(progressKey) || 1);
    if (saved > 1 && saved <= doc.numPages) setTimeout(() => goTo(saved), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  useEffect(() => {
    if (doc) localStorage.setItem(progressKey, String(page));
  }, [page, doc, progressKey]);

  useEffect(() => {
    const onFs = () => setFull(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const goTo = useCallback((n: number) => {
    const el = scrollRef.current?.querySelector(`[data-page="${n}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  function onScroll() {
    const c = scrollRef.current;
    if (!c) return;
    const pages = c.querySelectorAll<HTMLElement>("[data-page]");
    const top = c.scrollTop + c.clientHeight / 3;
    let current = 1;
    pages.forEach((p) => {
      if (p.offsetTop <= top) current = Number(p.dataset.page);
    });
    setPage(current);
  }

  async function toggleFull() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await wrapRef.current?.requestFullscreen?.();
  }

  async function download() {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/[^\w\s-]/g, "").trim() || "book"}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  const total = doc?.numPages ?? 0;
  const pct = total ? Math.round((page / total) * 100) : 0;

  return (
    <div ref={wrapRef} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-secondary/40">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
        <Button size="icon" variant="ghost" disabled={page <= 1} onClick={() => goTo(page - 1)} aria-label="Previous page">
          <ChevronLeft />
        </Button>
        <span className="min-w-[72px] text-center text-xs font-medium tabular-nums">
          {total ? `${page} / ${total}` : "—"}
        </span>
        <Button size="icon" variant="ghost" disabled={!total || page >= total} onClick={() => goTo(page + 1)} aria-label="Next page">
          <ChevronRight />
        </Button>
        <div className="mx-1 h-5 w-px bg-border" />
        <Button size="icon" variant="ghost" onClick={() => setScale((s) => Math.max(0.5, +(s - 0.15).toFixed(2)))} aria-label="Zoom out">
          <ZoomOut />
        </Button>
        <span className="w-10 text-center text-xs tabular-nums">{Math.round(scale * 100)}%</span>
        <Button size="icon" variant="ghost" onClick={() => setScale((s) => Math.min(3, +(s + 0.15).toFixed(2)))} aria-label="Zoom in">
          <ZoomIn />
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={download}>
            <Download /> <span className="hidden sm:inline">Download</span>
          </Button>
          <Button size="icon" variant="ghost" onClick={toggleFull} aria-label="Full screen">
            {full ? <Minimize2 /> : <Maximize2 />}
          </Button>
        </div>
      </div>
      <div className="h-1 w-full bg-border">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className={(full ? "h-[calc(100vh-56px)]" : "h-[80vh]") + " overflow-auto px-3 py-4"}
      >
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
            <p>{error}</p>
            <Button size="sm" variant="outline" onClick={() => setAttempt((a) => a + 1)}>
              <RotateCw /> Try again
            </Button>
          </div>
        ) : !doc ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Opening book…
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {Array.from({ length: total }, (_, i) => (
              <PdfPage key={i + 1} doc={doc} n={i + 1} width={baseWidth * scale} root={scrollRef} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PdfPage({
  doc,
  n,
  width,
  root,
}: {
  doc: PDFDoc;
  n: number;
  width: number;
  root: React.RefObject<HTMLDivElement | null>;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(n <= 2);
  const [ratio, setRatio] = useState(1.414);

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { root: root.current, rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  useEffect(() => {
    if (!visible) return;
    let task: any;
    let cancelled = false;
    (async () => {
      const pg = await doc.getPage(n);
      const vp1 = pg.getViewport({ scale: 1 });
      if (cancelled) return;
      setRatio(vp1.height / vp1.width);
      const dpr = window.devicePixelRatio || 1;
      const vp = pg.getViewport({ scale: (width / vp1.width) * dpr });
      const c = canvas.current;
      if (!c) return;
      c.width = vp.width;
      c.height = vp.height;
      task = pg.render({ canvasContext: c.getContext("2d")!, viewport: vp });
      await task.promise.catch(() => {});
    })();
    return () => {
      cancelled = true;
      task?.cancel?.();
    };
  }, [visible, doc, n, width]);

  return (
    <div
      ref={holder}
      data-page={n}
      className="relative bg-card shadow-[var(--shadow-book)]"
      style={{ width, height: width * ratio }}
    >
      <canvas ref={canvas} className="block h-full w-full" />
    </div>
  );
}
