-- Create universes table
CREATE TABLE IF NOT EXISTS public.universes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed universes with the specified values
INSERT INTO public.universes (name) VALUES
  ('Dungeons & Dragons'),
  ('Heroquest'),
  ('Lord of the Rings'),
  ('Lovecraft'),
  ('Other'),
  ('Warhammer 40,000'),
  ('Warhammer Fantasy')
ON CONFLICT (name) DO NOTHING;

-- Add universe_id column to games table
ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS universe_id UUID REFERENCES public.universes(id) ON DELETE SET NULL;

-- Create index for universe_id
CREATE INDEX IF NOT EXISTS idx_games_universe_id ON public.games(universe_id);

-- Enable Row Level Security (universes are public reference data)
ALTER TABLE public.universes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read universes
CREATE POLICY "Anyone can view universes"
  ON public.universes
  FOR SELECT
  USING (true);
