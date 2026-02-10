-- Create army_types table
CREATE TABLE IF NOT EXISTS public.army_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.army_types ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Anyone can view army types"
  ON public.army_types
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert army types"
  ON public.army_types
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update army types"
  ON public.army_types
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete army types"
  ON public.army_types
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert existing army types
INSERT INTO public.army_types (name, description) VALUES
  ('loyalist', 'Loyalist forces of the Imperium'),
  ('traitor', 'Traitor forces that turned against the Imperium'),
  ('xenos', 'Alien races from beyond the Imperium'),
  ('chaos', 'Forces corrupted by Chaos'),
  ('imperium', 'Imperial forces')
ON CONFLICT (name) DO NOTHING;

-- Drop the old CHECK constraint to allow new army types
ALTER TABLE public.factions
  DROP CONSTRAINT IF EXISTS factions_army_type_check;

-- Add army_type_id column to factions table (nullable initially)
ALTER TABLE public.factions
  ADD COLUMN IF NOT EXISTS army_type_id UUID REFERENCES public.army_types(id);

-- Populate army_type_id based on existing army_type values
UPDATE public.factions f
SET army_type_id = at.id
FROM public.army_types at
WHERE f.army_type = at.name
  AND f.army_type_id IS NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_factions_army_type_id ON public.factions(army_type_id);

-- NOTE: Keeping the old army_type column for backward compatibility
-- We'll use army_type_id going forward, but army_type remains as fallback
-- The CHECK constraint has been removed to allow new army types
