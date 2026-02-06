-- Create base_shapes table
CREATE TABLE IF NOT EXISTS public.base_shapes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create base_types table
CREATE TABLE IF NOT EXISTS public.base_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bases table
CREATE TABLE IF NOT EXISTS public.bases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert base shapes
INSERT INTO public.base_shapes (name) VALUES
  ('Round'),
  ('Square'),
  ('Oval'),
  ('Rectangle');

-- Insert base types
INSERT INTO public.base_types (name) VALUES
  ('Flying'),
  ('Legions Imperialis');

-- Insert bases
INSERT INTO public.bases (name) VALUES
  ('20mm'),
  ('25mm'),
  ('28mm'),
  ('28.5mm'),
  ('32mm'),
  ('40mm'),
  ('50mm'),
  ('60mm'),
  ('65mm'),
  ('80mm'),
  ('90mm'),
  ('100mm'),
  ('105mm'),
  ('120mm'),
  ('130mm'),
  ('25x50mm'),
  ('30x60mm'),
  ('40x60mm'),
  ('50x100mm'),
  ('60x35mm'),
  ('75x46mm'),
  ('100x60mm'),
  ('105x70mm'),
  ('120x92mm');

-- Add new columns to miniatures table for base references
ALTER TABLE public.miniatures
  ADD COLUMN IF NOT EXISTS base_id UUID REFERENCES public.bases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS base_shape_id UUID REFERENCES public.base_shapes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS base_type_id UUID REFERENCES public.base_types(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_miniatures_base_id ON public.miniatures(base_id);
CREATE INDEX IF NOT EXISTS idx_miniatures_base_shape_id ON public.miniatures(base_shape_id);
CREATE INDEX IF NOT EXISTS idx_miniatures_base_type_id ON public.miniatures(base_type_id);

-- Enable Row Level Security on new tables (read-only for authenticated users)
ALTER TABLE public.base_shapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.base_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bases ENABLE ROW LEVEL SECURITY;

-- Create policies for read access
CREATE POLICY "Anyone can view base shapes"
  ON public.base_shapes
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view base types"
  ON public.base_types
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view bases"
  ON public.bases
  FOR SELECT
  USING (true);
