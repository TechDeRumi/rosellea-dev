
-- Revoke execute on internal helpers
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Storage policies (public read; authenticated write to own folder)
CREATE POLICY "storage_read_all" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('avatars','books','covers'));
CREATE POLICY "storage_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('avatars','books','covers') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "storage_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('avatars','books','covers') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "storage_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('avatars','books','covers') AND (storage.foldername(name))[1] = auth.uid()::text);
