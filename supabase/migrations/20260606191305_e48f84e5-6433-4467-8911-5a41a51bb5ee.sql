
-- Lock down SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- authenticated still needs EXECUTE so RLS policies work
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- ============ Storage policies on gallery bucket ============
-- path layout: {user_id}/filename.ext
CREATE POLICY "Users read own gallery files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'gallery' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users upload to own gallery folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gallery' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own gallery files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'gallery' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own gallery files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'gallery' AND (storage.foldername(name))[1] = auth.uid()::text);
