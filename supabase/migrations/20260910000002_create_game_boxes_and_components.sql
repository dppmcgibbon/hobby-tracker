-- Create game_boxes table
CREATE TABLE IF NOT EXISTS public.game_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  box_type TEXT NOT NULL DEFAULT 'core',
  condition TEXT DEFAULT 'good',
  location TEXT,
  barcode TEXT,
  notes TEXT,
  
  -- Hierarchical game linkage
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  edition_id UUID REFERENCES public.editions(id) ON DELETE SET NULL,
  expansion_id UUID REFERENCES public.expansions(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT chk_game_box_hierarchy CHECK (
    expansion_id IS NULL OR edition_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_game_boxes_game_id ON public.game_boxes(game_id);
CREATE INDEX IF NOT EXISTS idx_game_boxes_edition_id ON public.game_boxes(edition_id);
CREATE INDEX IF NOT EXISTS idx_game_boxes_expansion_id ON public.game_boxes(expansion_id);

-- Create game_components table
CREATE TABLE IF NOT EXISTS public.game_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_box_id UUID NOT NULL REFERENCES public.game_boxes(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  component_type TEXT NOT NULL DEFAULT 'other',
  quantity_expected INTEGER NOT NULL DEFAULT 1,
  quantity_actual INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'complete',
  description TEXT,
  notes TEXT,
  image_storage_path TEXT,
  image_updated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_components_box_id ON public.game_components(game_box_id);
CREATE INDEX IF NOT EXISTS idx_game_components_type ON public.game_components(component_type);
CREATE INDEX IF NOT EXISTS idx_game_components_status ON public.game_components(status);

-- Enable RLS
ALTER TABLE public.game_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_components ENABLE ROW LEVEL SECURITY;

-- Policies for game_boxes
CREATE POLICY "Anyone can view game boxes"
  ON public.game_boxes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert game boxes"
  ON public.game_boxes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update game boxes"
  ON public.game_boxes FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete game boxes"
  ON public.game_boxes FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Policies for game_components
CREATE POLICY "Anyone can view game components"
  ON public.game_components FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert game components"
  ON public.game_components FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update game components"
  ON public.game_components FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete game components"
  ON public.game_components FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);
