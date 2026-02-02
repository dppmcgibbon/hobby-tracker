-- Create shared_miniatures table
CREATE TABLE IF NOT EXISTS public.shared_miniatures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  miniature_id UUID REFERENCES public.miniatures(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  is_public BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.shared_miniatures ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own shared miniatures"
  ON public.shared_miniatures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public shared miniatures by token"
  ON public.shared_miniatures FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can create shares for their miniatures"
  ON public.shared_miniatures FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.miniatures
      WHERE id = shared_miniatures.miniature_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their shares"
  ON public.shared_miniatures FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their shares"
  ON public.shared_miniatures FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_shared_miniatures_token ON public.shared_miniatures(share_token);
CREATE INDEX idx_shared_miniatures_user_id ON public.shared_miniatures(user_id);
CREATE INDEX idx_shared_miniatures_miniature_id ON public.shared_miniatures(miniature_id);

-- Function to generate share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'base64');
END;
$$ LANGUAGE plpgsql;