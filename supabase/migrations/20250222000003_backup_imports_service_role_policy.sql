-- Allow service role to read and delete in backup-imports so server actions can download
-- the uploaded ZIP and remove it after processing (import database / import photos only).
DROP POLICY IF EXISTS "Users can read their own backup imports" ON storage.objects;
CREATE POLICY "Users can read their own backup imports"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'backup-imports' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR (auth.jwt() ->> 'role') = 'service_role')
  );

DROP POLICY IF EXISTS "Users can delete their own backup imports" ON storage.objects;
CREATE POLICY "Users can delete their own backup imports"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'backup-imports' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR (auth.jwt() ->> 'role') = 'service_role')
  );
