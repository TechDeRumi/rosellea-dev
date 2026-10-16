import type { Database } from "@/integrations/supabase/types";

export type LanguageCode = "en" | "ur" | "ps" | "ar" | "tr";

export const LANGUAGES: { code: LanguageCode; name: string; native: string; rtl: boolean; flag: string }[] = [
  { code: "en", name: "English", native: "English", rtl: false, flag: "🇬🇧" },
  { code: "ur", name: "Urdu", native: "اردو", rtl: true, flag: "🇵🇰" },
  { code: "ps", name: "Pashto", native: "پښتو", rtl: true, flag: "🇦🇫" },
  { code: "ar", name: "Arabic", native: "العربية", rtl: true, flag: "🇸🇦" },
  { code: "tr", name: "Turkish", native: "Türkçe", rtl: false, flag: "🇹🇷" },
];

export const LANG_MAP: Record<LanguageCode, (typeof LANGUAGES)[number]> = LANGUAGES.reduce(
  (acc, l) => {
    acc[l.code] = l;
    return acc;
  },
  {} as Record<LanguageCode, (typeof LANGUAGES)[number]>,
);

export const CATEGORIES = [
  "Literature",
  "History",
  "Philosophy",
  "Religion",
  "Poetry",
  "Science",
  "Technology",
  "Politics",
  "Culture",
  "Education",
  "Health",
  "Business",
  "Self-help",
  "Fiction",
  "Biography",
] as const;

export type ContentType = Database["public"]["Enums"]["content_type"];
