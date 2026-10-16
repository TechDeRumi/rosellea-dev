
-- Extend posts with AI metadata
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS ai_metadata jsonb,
  ADD COLUMN IF NOT EXISTS ai_status text NOT NULL DEFAULT 'pending' CHECK (ai_status IN ('pending','analyzing','ready','failed')),
  ADD COLUMN IF NOT EXISTS ai_error text,
  ADD COLUMN IF NOT EXISTS reading_minutes int,
  ADD COLUMN IF NOT EXISTS difficulty text,
  ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS topics text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS posts_keywords_gin ON public.posts USING gin (keywords);
CREATE INDEX IF NOT EXISTS posts_topics_gin ON public.posts USING gin (topics);
CREATE INDEX IF NOT EXISTS posts_ai_metadata_gin ON public.posts USING gin (ai_metadata);
CREATE INDEX IF NOT EXISTS posts_type_published_idx ON public.posts (type, published, created_at DESC);

-- book_chapters
CREATE TABLE IF NOT EXISTS public.book_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  idx int NOT NULL,
  title text NOT NULL,
  summary text,
  content text NOT NULL,
  keywords text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, idx)
);
GRANT SELECT ON public.book_chapters TO authenticated;
GRANT ALL ON public.book_chapters TO service_role;
ALTER TABLE public.book_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read chapters of published books" ON public.book_chapters
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND (p.published = true OR p.author_id = auth.uid()))
  );
CREATE INDEX IF NOT EXISTS book_chapters_post_idx ON public.book_chapters (post_id, idx);
CREATE INDEX IF NOT EXISTS book_chapters_keywords_gin ON public.book_chapters USING gin (keywords);

-- book_flashcards
CREATE TABLE IF NOT EXISTS public.book_flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'en',
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.book_flashcards TO authenticated;
GRANT ALL ON public.book_flashcards TO service_role;
ALTER TABLE public.book_flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read flashcards of published books" ON public.book_flashcards
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND (p.published = true OR p.author_id = auth.uid()))
  );
CREATE INDEX IF NOT EXISTS book_flashcards_post_idx ON public.book_flashcards (post_id, language);

-- book_quizzes
CREATE TABLE IF NOT EXISTS public.book_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'en',
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_index int NOT NULL,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.book_quizzes TO authenticated;
GRANT ALL ON public.book_quizzes TO service_role;
ALTER TABLE public.book_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read quizzes of published books" ON public.book_quizzes
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND (p.published = true OR p.author_id = auth.uid()))
  );
CREATE INDEX IF NOT EXISTS book_quizzes_post_idx ON public.book_quizzes (post_id, language);

-- book_highlights (per user)
CREATE TABLE IF NOT EXISTS public.book_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  chapter_id uuid REFERENCES public.book_chapters(id) ON DELETE SET NULL,
  text text NOT NULL,
  color text NOT NULL DEFAULT 'yellow',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_highlights TO authenticated;
GRANT ALL ON public.book_highlights TO service_role;
ALTER TABLE public.book_highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own highlights" ON public.book_highlights
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS book_highlights_user_post_idx ON public.book_highlights (user_id, post_id, created_at DESC);

-- book_notes (per user)
CREATE TABLE IF NOT EXISTS public.book_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  chapter_id uuid REFERENCES public.book_chapters(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_notes TO authenticated;
GRANT ALL ON public.book_notes TO service_role;
ALTER TABLE public.book_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own notes" ON public.book_notes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS book_notes_user_post_idx ON public.book_notes (user_id, post_id, updated_at DESC);
CREATE TRIGGER book_notes_updated_at BEFORE UPDATE ON public.book_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- reading_progress (per user per post)
CREATE TABLE IF NOT EXISTS public.reading_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.book_chapters(id) ON DELETE SET NULL,
  chapter_idx int,
  scroll_ratio real DEFAULT 0,
  percent int DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_progress TO authenticated;
GRANT ALL ON public.reading_progress TO service_role;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own reading progress" ON public.reading_progress
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS reading_progress_user_idx ON public.reading_progress (user_id, updated_at DESC);
CREATE TRIGGER reading_progress_updated_at BEFORE UPDATE ON public.reading_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
