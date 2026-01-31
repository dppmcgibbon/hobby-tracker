-- Create factions table
CREATE TABLE IF NOT EXISTS public.factions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  army_type TEXT NOT NULL CHECK (army_type IN ('loyalist', 'traitor', 'xenos', 'chaos', 'imperium')),
  description TEXT,
  color_hex TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.factions ENABLE ROW LEVEL SECURITY;

-- Create policies (read-only for all authenticated users)
CREATE POLICY "Anyone can view factions"
  ON public.factions
  FOR SELECT
  USING (true);

-- Create index for faster lookups
CREATE INDEX idx_factions_army_type ON public.factions(army_type);
CREATE INDEX idx_factions_name ON public.factions(name);