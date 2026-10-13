-- Create game_component_photos table to support multiple photos per component
CREATE TABLE IF NOT EXISTS public.game_component_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES public.game_components(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  image_updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_component_photos_comp_id 
  ON public.game_component_photos(component_id);
CREATE INDEX IF NOT EXISTS idx_game_component_photos_order 
  ON public.game_component_photos(component_id, display_order);
CREATE INDEX IF NOT EXISTS idx_game_component_photos_uploaded 
  ON public.game_component_photos(uploaded_at DESC);

-- Enable Row Level Security
ALTER TABLE public.game_component_photos ENABLE ROW LEVEL SECURITY;

-- Policies for public view and authenticated modification
CREATE POLICY "Anyone can view game component photos"
  ON public.game_component_photos FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert game component photos"
  ON public.game_component_photos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update game component photos"
  ON public.game_component_photos FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete game component photos"
  ON public.game_component_photos FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);
