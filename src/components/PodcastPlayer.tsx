import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiPodcastChunks } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Headphones, Loader2, Pause, Play, SkipBack, SkipForward, Download, Gauge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { LanguageCode } from "@/lib/constants";

const VOICES = ["Kore", "Puck", "Charon", "Aoede", "Fenrir", "Leda", "Orus", "Zephyr"] as const;

export function PodcastPlayer({ postId, language }: { postId: string; language: LanguageCode }) {
  const fetchChunks = useServerFn(aiPodcastChunks);
  const [chunks, setChunks] = useState<string[]>([]);
  const [title, setTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobsRef = useRef<Record<number, string>>({}); // i -> object URL
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [bufferingFor, setBufferingFor] = useState<number | null>(null);
  const [rate, setRate] = useState(1);
  const [voice, setVoice] = useState<typeof VOICES[number]>("Kore");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchChunks({ data: { postId, language } })
      .then((r) => {
        if (!alive) return;
        setChunks(r.chunks);
        setTitle(r.title);
      })
      .catch((e) => toast.error(e?.message ?? "Could not prepare podcast"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
      // revoke URLs
      Object.values(blobsRef.current).forEach((u) => URL.revokeObjectURL(u));
      blobsRef.current = {};
    };
  }, [postId, language, fetchChunks]);

  async function ensureChunk(i: number): Promise<string | null> {
    if (blobsRef.current[i]) return blobsRef.current[i];
    if (i < 0 || i >= chunks.length) return null;
    setBufferingFor(i);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        toast.error("Sign in for the podcast feature");
        return null;
      }
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: chunks[i], voice }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `TTS error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      blobsRef.current[i] = url;
      return url;
    } catch (e: any) {
      toast.error(e?.message ?? "Audio failed");
      return null;
    } finally {
      setBufferingFor(null);
    }
  }

  async function play(i: number) {
    const url = await ensureChunk(i);
    if (!url || !audioRef.current) return;
    audioRef.current.src = url;
    audioRef.current.playbackRate = rate;
    try {
      await audioRef.current.play();
      setPlaying(true);
      setIndex(i);
      // pre-fetch next
      if (i + 1 < chunks.length) ensureChunk(i + 1);
    } catch {
      /* user gesture needed */
    }
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      if (!audioRef.current.src) {
        play(index);
      } else {
        audioRef.current.play();
        setPlaying(true);
      }
    }
  }

  function onEnded() {
    if (index + 1 < chunks.length) play(index + 1);
    else setPlaying(false);
  }

  function setSpeed(r: number) {
    setRate(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
  }

  async function downloadCurrent() {
    const url = await ensureChunk(index);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "rosellea"}-part-${index + 1}.wav`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing podcast…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
        <Headphones className="h-4 w-4 text-primary" /> Podcast mode
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Now listening</div>
        <div className="mt-1 text-lg font-semibold leading-snug">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Part {index + 1} of {chunks.length}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-center gap-3">
            <Button size="icon" variant="outline" disabled={index === 0} onClick={() => play(index - 1)}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button size="icon" className="h-12 w-12 rounded-full" onClick={togglePlay} disabled={bufferingFor !== null}>
              {bufferingFor !== null ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : playing ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            <Button
              size="icon"
              variant="outline"
              disabled={index + 1 >= chunks.length}
              onClick={() => play(index + 1)}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
          <audio
            ref={audioRef}
            onEnded={onEnded}
            onPause={() => setPlaying(false)}
            onPlay={() => setPlaying(true)}
            className="hidden"
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Gauge className="h-3.5 w-3.5" />
              {[0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => (
                <button
                  key={r}
                  onClick={() => setSpeed(r)}
                  className={
                    "rounded-full px-2 py-0.5 " +
                    (rate === r ? "bg-primary text-primary-foreground" : "hover:bg-secondary")
                  }
                >
                  {r}×
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={downloadCurrent}>
              <Download className="mr-1 h-3.5 w-3.5" /> Download part
            </Button>
          </div>

          <div className="mt-4">
            <label className="text-xs text-muted-foreground">Voice</label>
            <select
              value={voice}
              onChange={(e) => {
                // Voice change invalidates cached audio
                Object.values(blobsRef.current).forEach((u) => URL.revokeObjectURL(u));
                blobsRef.current = {};
                setVoice(e.target.value as typeof VOICES[number]);
                if (audioRef.current) audioRef.current.src = "";
              }}
              className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            >
              {VOICES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ol className="mt-6 space-y-1 text-sm">
          {chunks.map((c, i) => (
            <li key={i}>
              <button
                onClick={() => play(i)}
                className={
                  "block w-full rounded-lg px-3 py-2 text-left transition " +
                  (i === index ? "bg-primary/10 font-medium" : "hover:bg-secondary")
                }
              >
                <span className="text-xs text-muted-foreground">Part {i + 1}</span>
                <div className="line-clamp-1 text-foreground">{c.slice(0, 90)}…</div>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}