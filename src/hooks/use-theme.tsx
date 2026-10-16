import { useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

const THEME_KEY = "rosellea-theme";
const LEGACY_THEME_KEY = "saimar-theme";

function readStoredTheme(): Theme | null {
  const v =
    localStorage.getItem(THEME_KEY) ??
    localStorage.getItem(LEGACY_THEME_KEY);
  return v === "light" || v === "dark" ? v : null;
}

function detectInitial(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = readStoredTheme();
  if (stored) return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const t = detectInitial();
    setTheme(t);
    applyTheme(t);
    // follow system if user hasn't chosen
    if (readStoredTheme()) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      const next = e.matches ? "dark" : "light";
      setTheme(next);
      applyTheme(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      try { localStorage.removeItem(LEGACY_THEME_KEY); } catch {}
      applyTheme(next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
