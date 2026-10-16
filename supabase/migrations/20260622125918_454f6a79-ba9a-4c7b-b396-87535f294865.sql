
-- 1. Verified flag on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;

-- 2. Roles
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

CREATE POLICY "users can see their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 3. Admin can set verified on profiles
CREATE POLICY "admins update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 4. Comment replies
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON public.comments(parent_id);

-- 5. Comment likes
CREATE TABLE public.comment_likes (
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.comment_likes TO authenticated;
GRANT ALL ON public.comment_likes TO service_role;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone signed in reads comment likes" ON public.comment_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "users like comments" ON public.comment_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users unlike comments" ON public.comment_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. Notifications
CREATE TYPE public.notification_type AS ENUM ('like','comment','reply','follow','verification','book','article');

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  content_id UUID,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  message TEXT,
  read_status BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_receiver_idx ON public.notifications(receiver_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read their notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = receiver_id);
CREATE POLICY "users update their notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);
CREATE POLICY "users delete their notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = receiver_id);

-- 7. Triggers to auto-create notifications
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE author UUID;
BEGIN
  SELECT author_id INTO author FROM public.posts WHERE id = NEW.post_id;
  IF author IS NOT NULL AND author <> NEW.user_id THEN
    INSERT INTO public.notifications(sender_id, receiver_id, type, content_id, post_id)
    VALUES (NEW.user_id, author, 'like', NEW.post_id, NEW.post_id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_on_like AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE author UUID; parent_author UUID;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_author FROM public.comments WHERE id = NEW.parent_id;
    IF parent_author IS NOT NULL AND parent_author <> NEW.user_id THEN
      INSERT INTO public.notifications(sender_id, receiver_id, type, content_id, post_id)
      VALUES (NEW.user_id, parent_author, 'reply', NEW.id, NEW.post_id);
    END IF;
  END IF;
  SELECT author_id INTO author FROM public.posts WHERE id = NEW.post_id;
  IF author IS NOT NULL AND author <> NEW.user_id
     AND (NEW.parent_id IS NULL OR author <> COALESCE(parent_author, '00000000-0000-0000-0000-000000000000'::uuid)) THEN
    INSERT INTO public.notifications(sender_id, receiver_id, type, content_id, post_id)
    VALUES (NEW.user_id, author, 'comment', NEW.id, NEW.post_id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_on_comment AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- 8. Notify on verification change
CREATE OR REPLACE FUNCTION public.notify_on_verification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.verified IS DISTINCT FROM OLD.verified AND NEW.verified = true THEN
    INSERT INTO public.notifications(sender_id, receiver_id, type, message)
    VALUES (NULL, NEW.id, 'verification', 'You have been verified ✓');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_on_verification AFTER UPDATE OF verified ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_on_verification();

-- 9. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;
