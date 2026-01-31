-- Create storage bucket for miniature photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('miniature-photos', 'miniature-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload their own photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'miniature-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view photos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'miniature-photos');

CREATE POLICY "Users can update their own photos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'miniature-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own photos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'miniature-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );