import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { AI_MODELS, isModelUnavailableError, MODEL_UNAVAILABLE_MESSAGE } from "@/lib/ai-models";
import type { Database } from "@/integrations/supabase/types";

const Body = z.object({
  text: z.string().min(1).max(8000),
  voice: z
    .enum(["Kore", "Puck", "Charon", "Aoede", "Fenrir", "Leda", "Orus", "Zephyr"])
    .optional(),
});

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !GEMINI_API_KEY) {
          return new Response("Server misconfigured", { status: 500 });
        }
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
        const token = auth.slice(7);
        const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const claims = await supabase.auth.getClaims(token);
        if (claims.error || !claims.data?.claims?.sub) {
          return new Response("Invalid token", { status: 401 });
        }

        let body: z.infer<typeof Body>;
        try {
          body = Body.parse(await request.json());
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const upstream = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODELS.tts}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
            body: JSON.stringify({
              contents: [{ parts: [{ text: body.text }] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: body.voice ?? "Kore" } },
                },
              },
            }),
          },
        );
        if (!upstream.ok) {
          const text = await upstream.text();
          if (upstream.status === 429) return new Response("AI is busy", { status: 429 });
          if (isModelUnavailableError(upstream.status, text))
            return new Response(MODEL_UNAVAILABLE_MESSAGE, { status: 502 });
          return new Response(`TTS error: ${text.slice(0, 200)}`, { status: 502 });
        }
        const json = (await upstream.json()) as any;
        const b64: string | undefined = json?.candidates?.[0]?.content?.parts?.find(
          (p: any) => p?.inlineData?.data,
        )?.inlineData?.data;
        if (!b64) return new Response("TTS returned no audio", { status: 502 });
        const bin = atob(b64);
        const pcm = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) pcm[i] = bin.charCodeAt(i);
        return new Response(pcmToWav(pcm, 24000), {
          headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
        });
      },
    },
  },
});

// Gemini TTS returns raw 16-bit mono PCM; wrap it in a WAV header so browsers can play it.
function pcmToWav(pcm: Uint8Array, sampleRate: number): ArrayBuffer {
  const out = new Uint8Array(44 + pcm.length);
  const v = new DataView(out.buffer);
  const w = (o: number, t: string) => { for (let i = 0; i < t.length; i++) out[o + i] = t.charCodeAt(i); };
  w(0, "RIFF"); v.setUint32(4, 36 + pcm.length, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, pcm.length, true);
  out.set(pcm, 44);
  return out.buffer as ArrayBuffer;
}
