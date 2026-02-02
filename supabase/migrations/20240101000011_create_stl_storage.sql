-- Create storage bucket for STL files
INSERT INTO storage.buckets (id, name, public)
VALUES ('stl-files', 'stl-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload their own STL files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'stl-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own STL files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'stl-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own STL files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'stl-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own STL files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'stl-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create storage bucket for STL thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('stl-thumbnails', 'stl-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for thumbnails
CREATE POLICY "Users can upload their own STL thumbnails"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'stl-thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view STL thumbnails"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'stl-thumbnails');

CREATE POLICY "Users can update their own STL thumbnails"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'stl-thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own STL thumbnails"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'stl-thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );