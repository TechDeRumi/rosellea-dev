
-- post_summaries: cached AI summaries per post/language/length
CREATE TABLE public.post_summaries (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  length TEXT NOT NULL CHECK (length IN ('quick','medium','detailed')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, language, length)
);
GRANT SELECT ON public.post_summaries TO authenticated;
GRANT ALL ON public.post_summaries TO service_role;
ALTER TABLE public.post_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "summaries readable by all authed" ON public.post_summaries
  FOR SELECT TO authenticated USING (true);

-- assistant_messages: per-(user, post) conversation history
CREATE TABLE public.assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX assistant_messages_user_post_idx ON public.assistant_messages(user_id, post_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.assistant_messages TO authenticated;
GRANT ALL ON public.assistant_messages TO service_role;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own assistant msgs select" ON public.assistant_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own assistant msgs insert" ON public.assistant_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own assistant msgs delete" ON public.assistant_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- post_knowledge: cached knowledge timeline payload per post/language
CREATE TABLE public.post_knowledge (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, language)
);
GRANT SELECT ON public.post_knowledge TO authenticated;
GRANT ALL ON public.post_knowledge TO service_role;
ALTER TABLE public.post_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "knowledge readable by all authed" ON public.post_knowledge
  FOR SELECT TO authenticated USING (true);
