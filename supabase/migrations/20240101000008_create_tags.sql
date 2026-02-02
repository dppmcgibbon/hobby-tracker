-- Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own tags"
  ON public.tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags"
  ON public.tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
  ON public.tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
  ON public.tags FOR DELETE
  USING (auth.uid() = user_id);

-- Create miniature_tags junction table
CREATE TABLE IF NOT EXISTS public.miniature_tags (
  miniature_id UUID REFERENCES public.miniatures(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (miniature_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.miniature_tags ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own miniature tags"
  ON public.miniature_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.miniatures
      WHERE id = miniature_tags.miniature_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own miniature tags"
  ON public.miniature_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.miniatures
      WHERE id = miniature_tags.miniature_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own miniature tags"
  ON public.miniature_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.miniatures
      WHERE id = miniature_tags.miniature_id
      AND user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_tags_user_id ON public.tags(user_id);
CREATE INDEX idx_miniature_tags_miniature_id ON public.miniature_tags(miniature_id);
CREATE INDEX idx_miniature_tags_tag_id ON public.miniature_tags(tag_id);

-- Create collections table
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own collections"
  ON public.collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own collections"
  ON public.collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
  ON public.collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
  ON public.collections FOR DELETE
  USING (auth.uid() = user_id);

-- Create collection_miniatures junction table
CREATE TABLE IF NOT EXISTS public.collection_miniatures (
  collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE NOT NULL,
  miniature_id UUID REFERENCES public.miniatures(id) ON DELETE CASCADE NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (collection_id, miniature_id)
);

-- Enable RLS
ALTER TABLE public.collection_miniatures ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own collection miniatures"
  ON public.collection_miniatures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE id = collection_miniatures.collection_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add miniatures to their collections"
  ON public.collection_miniatures FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE id = collection_miniatures.collection_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove miniatures from their collections"
  ON public.collection_miniatures FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE id = collection_miniatures.collection_id
      AND user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_collections_user_id ON public.collections(user_id);
CREATE INDEX idx_collection_miniatures_collection_id ON public.collection_miniatures(collection_id);
CREATE INDEX idx_collection_miniatures_miniature_id ON public.collection_miniatures(miniature_id);

-- Apply updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();