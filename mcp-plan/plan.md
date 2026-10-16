# Rosellea — Rebrand + Premium Book AI (phased)

This request is huge (15 sections). To ship it well without regressing existing features, I'll do it in three focused turns. This turn = **Phase A** only. Phases B & C follow after you review.

---

## Phase A — Rebrand + Splash + Logo system (this turn)

Covers sections 1, 2, 3, and the "no SaiMar left anywhere" acceptance checks.

1. **Logos**
   - Upload both provided PNGs as Lovable assets: `rosellea-black.png` (light theme), `rosellea-white.png` (dark theme).
   - Rewrite `src/components/Logo.tsx` → `<Wordmark>` / `<Mark>` auto-pick black vs white based on the active theme (`useTheme`), with a manual `variant` override for surfaces that are always dark (purple hero, splash) or always light. Uses the existing theme hook, no new deps.
   - Delete stale `saimar-*` asset JSONs.

2. **Global text rebrand — SaiMar → Rosellea**
   - Sweep with `rg -l Saimar\|SaiMar\|saimar` and replace in: `src/routes/__root.tsx` (title, meta, og), `src/routes/**` head blocks, `AppShell`, footer, auth page, all toasts/notifications, sitemap, `public/robots.txt`, README, `.lovable/project.json` (display only), e2e specs comments.
   - Update DB seed strings that reference SaiMar in AI system prompts (`src/lib/ai.functions.ts`, `src/routes/api/assistant.ts`, `KnowledgeTimelinePanel` "SaiMar posts" wording).
   - Keep the Supabase project id / URL untouched — just user-visible strings.
   - Storage bucket names stay (renaming buckets is destructive); nothing user-visible references them.

3. **Premium splash**
   - New `src/components/Splash.tsx`: full-screen, theme-aware bg fade → logo fade+scale (cubic-bezier) → tagline "Knowledge Beyond Language" fade → hold → fade out. ~3.4s total, respects `prefers-reduced-motion` (skips to instant).
   - Mount once at app entry (`__root.tsx`), gated by `sessionStorage` so it doesn't replay on every route change; shows on cold load only.
   - Replace the existing brief splash if present.

4. **Favicon + PWA/meta**
   - New `public/favicon.png` from the black mark, delete old `favicon.ico`.
   - Update `<link rel="icon">`, `og:title`, `og:description`, `twitter:*`, `manifest`/theme-color to Rosellea.

5. **Memory update** — update `mem://index.md` Core rules: name is Rosellea, logo variant rule (black on light, white on dark), tagline.

**Acceptance for Phase A**: `rg -i saimar` returns nothing user-visible; splash plays once on cold load; correct logo variant in both themes on Home/Auth/Splash/Header/Footer.

---

## Phase B — Premium book reader + AI book pipeline (next turn)

Sections 4, 5, 6, 8, 10 (parts).

- New migration: extend `posts` with AI metadata columns (jsonb `ai_metadata`, `ai_status`, `reading_minutes`, `difficulty`, `keywords[]`, `topics[]`) + new tables `book_chapters`, `book_flashcards`, `book_quizzes`, `book_highlights`, `book_notes`, `reading_progress` (upgrade of existing `reading_history`).
- Background analysis: on PDF publish, enqueue a server fn `analyzeBook({postId})` that extracts text via `unpdf` (already used in `books.functions.ts`), chunks it, runs Gemini for structured JSON output (chapters, headings, topics, difficulty, keywords, TOC), writes rows. Status surfaces in UI (`analyzing` → `ready`).
- New book reader route redesign at `src/routes/_authenticated/post.$id.tsx` — hero (cover + meta + progress), sticky right rail with: Summary, Ask Book (chat), Study Notes, Flashcards, Quiz, Timeline, Related. Reuses existing `AssistantPanel`, `SummaryPanel`, `KnowledgeTimelinePanel`, `PodcastPlayer`; adds `FlashcardsPanel`, `QuizPanel`, `StudyNotesPanel`, `HighlightsLayer`.
- "Chat with book" uses chapter-aware context (chunk retrieval by chapter/keyword match — no vector DB in this phase; keeps scope tight and works on Workers).
- Search: extend `books.tsx` + articles search to query `ai_metadata->'keywords'`, `topics`, chapter titles via `ilike` + jsonb ops; add a Postgres GIN index.

## Phase C — Scale, polish, backend hardening (final turn)

Sections 9, 11, 12, 13, 14.

- Indexes on hot paths (posts by author/type/published, comments by post, likes by user).
- Realtime for comments/likes/notifications (single subscription per surface).
- Caching layer for AI results already in `post_summaries`/`post_knowledge`; extend to book analyses.
- Audit log table + trigger; creator earnings scaffold (table + read-only dashboard block).
- Error boundaries + retry logic in AI server fns (exponential backoff on 429).
- Perf pass: image lazy-load, route-level prefetch tuning, PDF worker only when reader opens.

---

## Out of scope for now (call out if wanted earlier)
- Native mobile splash (PWA install screen only).
- Vector embeddings for book chat (chunk-match works for Phase B; can add pgvector in a later phase if you want deeper recall).
- Renaming Supabase storage buckets.
- Email template rewrites beyond the Rosellea name swap (design refresh is its own turn).

Reply **"go"** to run Phase A now, or tell me to reshuffle scope.
