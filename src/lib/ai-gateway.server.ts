// Shared Google Gemini connection for every AI feature.
// Uses Gemini's OpenAI-compatible endpoint. Key: GEMINI_API_KEY (server-only).
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

export const GEMINI_BASE = BASE_URL;
import { AI_MODELS, isModelUnavailableError, MODEL_UNAVAILABLE_MESSAGE } from "./ai-models";
export const GEMINI_FAST_MODEL = AI_MODELS.fast;
export const GEMINI_PRO_MODEL = AI_MODELS.quality;

export function getGeminiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  return key;
}

export async function callAI(opts: {
  model?: string;
  system?: string;
  prompt: string;
}): Promise<string> {
  const key = getGeminiKey();
  const messages = [
    ...(opts.system ? [{ role: "system", content: opts.system }] : []),
    { role: "user", content: opts.prompt },
  ];
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: opts.model ?? GEMINI_FAST_MODEL, messages }),
    });
    if (res.ok) {
      const data = await res.json();
      return data?.choices?.[0]?.message?.content ?? "";
    }
    const text = await res.text();
    if (res.status === 429 || res.status >= 500) {
      lastErr = new Error(
        res.status === 429
          ? "AI is busy right now. Please try again in a moment."
          : `AI error ${res.status}: ${text.slice(0, 200)}`,
      );
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      continue;
    }
    if (isModelUnavailableError(res.status, text)) throw new Error(MODEL_UNAVAILABLE_MESSAGE);
    if (res.status === 401 || res.status === 403)
      throw new Error("Gemini API key is invalid or not allowed.");
    throw new Error(`AI error ${res.status}: ${text.slice(0, 200)}`);
  }
  throw lastErr ?? new Error("AI request failed");
}
