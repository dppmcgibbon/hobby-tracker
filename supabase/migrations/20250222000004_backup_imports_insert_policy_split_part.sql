-- Use split_part for path check in case storage.foldername() behaves differently on hosted Storage (fixes 400 on upload).
DROP POLICY IF EXISTS "Users can upload their own backup imports" ON storage.objects;
CREATE POLICY "Users can upload their own backup imports"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'backup-imports' AND
    split_part(name, '/', 1) = auth.uid()::text
  );
