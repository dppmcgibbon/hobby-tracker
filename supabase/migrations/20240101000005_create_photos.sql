-- Create miniature_photos table
CREATE TABLE IF NOT EXISTS public.miniature_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  miniature_id UUID REFERENCES public.miniatures(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  caption TEXT,
  photo_type TEXT DEFAULT 'progress' CHECK (photo_type IN ('wip', 'completed', 'detail', 'progress')),
  display_order INTEGER DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.miniature_photos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own miniature photos"
  ON public.miniature_photos
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own miniature photos"
  ON public.miniature_photos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own miniature photos"
  ON public.miniature_photos
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own miniature photos"
  ON public.miniature_photos
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_miniature_photos_miniature_id ON public.miniature_photos(miniature_id);
CREATE INDEX idx_miniature_photos_user_id ON public.miniature_photos(user_id);
CREATE INDEX idx_miniature_photos_uploaded_at ON public.miniature_photos(uploaded_at DESC);