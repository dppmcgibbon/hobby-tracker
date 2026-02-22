-- Allow service role to insert/update/delete in miniature-photos bucket (e.g. for sync-storage-to-remote script).
-- Expand existing policies so service_role JWT also passes (Storage API may still enforce RLS with service_role key).
DROP POLICY IF EXISTS "Users can upload their own photos" ON storage.objects;
CREATE POLICY "Users can upload their own photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'miniature-photos' AND
    (
      auth.uid()::text = (storage.foldername(name))[1]
      OR (auth.jwt() ->> 'role') = 'service_role'
    )
  );

DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
CREATE POLICY "Users can update their own photos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'miniature-photos' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR (auth.jwt() ->> 'role') = 'service_role')
  )
  WITH CHECK (
    bucket_id = 'miniature-photos' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR (auth.jwt() ->> 'role') = 'service_role')
  );

DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
CREATE POLICY "Users can delete their own photos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'miniature-photos' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR (auth.jwt() ->> 'role') = 'service_role')
  );
