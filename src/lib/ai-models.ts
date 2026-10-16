// Single source of truth for every Gemini model name used in Rosellea.
// Change a model here and every AI feature picks it up.
export const AI_MODELS = {
  /** Summaries, translation, timeline, book analysis, quizzes, flashcards, PDF translation */
  quality: "gemini-3.5-flash",
  /** Ask AI chat, writing help, default */
  fast: "gemini-3.5-flash",
  /** Podcast narration */
  tts: "gemini-3.1-flash-tts-preview",
} as const;

/** True when a Gemini error says the model doesn't exist / was retired. */
export function isModelUnavailableError(status: number, text: string): boolean {
  return (
    status === 404 ||
    /no longer available|not found|is not supported|does not exist|unknown model/i.test(text)
  );
}

export const MODEL_UNAVAILABLE_MESSAGE =
  "The AI model Rosellea uses is no longer available from Google. Please update the model name in the app settings and try again.";
