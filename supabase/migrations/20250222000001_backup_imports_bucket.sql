-- Temporary bucket for database backup import (client uploads here to avoid 413 on server action)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('backup-imports', 'backup-imports', false, 524288000)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 524288000;

-- 500MB limit; path format: {user_id}/import-{timestamp}.zip

CREATE POLICY "Users can upload their own backup imports"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'backup-imports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read their own backup imports"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'backup-imports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own backup imports"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'backup-imports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
