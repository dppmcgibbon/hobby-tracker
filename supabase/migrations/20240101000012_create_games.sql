-- Create games table
CREATE TABLE IF NOT EXISTS public.games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  publisher TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create editions table
CREATE TABLE IF NOT EXISTS public.editions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  year INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create expansions table
CREATE TABLE IF NOT EXISTS public.expansions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_id UUID REFERENCES public.editions(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  year INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create miniature_games junction table to link miniatures to games/editions/expansions
CREATE TABLE IF NOT EXISTS public.miniature_games (
  miniature_id UUID REFERENCES public.miniatures(id) ON DELETE CASCADE NOT NULL,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  edition_id UUID REFERENCES public.editions(id) ON DELETE SET NULL,
  expansion_id UUID REFERENCES public.expansions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (miniature_id, game_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_editions_game_id ON public.editions(game_id);
CREATE INDEX idx_editions_sequence ON public.editions(sequence);
CREATE INDEX idx_expansions_edition_id ON public.expansions(edition_id);
CREATE INDEX idx_expansions_sequence ON public.expansions(sequence);
CREATE INDEX idx_miniature_games_miniature_id ON public.miniature_games(miniature_id);
CREATE INDEX idx_miniature_games_game_id ON public.miniature_games(game_id);

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.editions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.expansions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert initial game data
INSERT INTO public.games (name) VALUES
  ('Warhammer 40,000'),
  ('Combat Patrol'),
  ('Kill Team')
ON CONFLICT DO NOTHING;

-- Insert editions data
-- Note: We'll need to get the game IDs after insert to properly link editions
-- This is a simplified version - you may want to adjust based on your actual game IDs
WITH game_ids AS (
  SELECT id, name FROM public.games
)
INSERT INTO public.editions (game_id, name, sequence, year)
SELECT 
  g.id,
  e.name,
  e.sequence,
  e.year
FROM (VALUES
  ('Warhammer 40,000', 'Rogue Trader', 1, NULL),
  ('Warhammer 40,000', '2', 2, NULL),
  ('Warhammer 40,000', '3', 3, NULL),
  ('Warhammer 40,000', '4', 4, NULL),
  ('Warhammer 40,000', '5', 5, NULL),
  ('Warhammer 40,000', '6', 6, NULL),
  ('Warhammer 40,000', '7', 7, NULL),
  ('Warhammer 40,000', '8', 8, NULL),
  ('Warhammer 40,000', '9', 9, NULL),
  ('Warhammer 40,000', '10', 10, NULL),
  ('Combat Patrol', '10', 10, NULL),
  ('Kill Team', '2013', 1, 2013),
  ('Kill Team', '2016', 2, 2016),
  ('Kill Team', '2018', 3, 2018),
  ('Kill Team', '2021', 4, 2021),
  ('Kill Team', '2024', 5, 2024)
) AS e(game_name, name, sequence, year)
JOIN game_ids g ON g.name = e.game_name
ON CONFLICT DO NOTHING;

-- Insert expansions data for Kill Team editions
WITH edition_ids AS (
  SELECT e.id, e.name as edition_name, g.name as game_name
  FROM public.editions e
  JOIN public.games g ON g.id = e.game_id
)
INSERT INTO public.expansions (edition_id, name, sequence, year)
SELECT 
  e.id,
  exp.name,
  exp.sequence,
  exp.year
FROM (VALUES
  ('Kill Team', '2021', 'Starter Set', 1, 2021),
  ('Kill Team', '2021', 'Chalnath', 2, NULL),
  ('Kill Team', '2021', 'Nachmund', 3, NULL),
  ('Kill Team', '2021', 'Moroch', 4, NULL),
  ('Kill Team', '2021', 'Into the Dark', 5, NULL),
  ('Kill Team', '2021', 'Annual 2022', 6, 2022),
  ('Kill Team', '2021', 'Shadowvaults', 7, NULL),
  ('Kill Team', '2021', 'Soulshackle', 8, NULL),
  ('Kill Team', '2021', 'Gallowfall', 9, NULL),
  ('Kill Team', '2021', 'Annual 2023', 10, 2023),
  ('Kill Team', '2021', 'Ashes of Faith', 11, NULL),
  ('Kill Team', '2021', 'Salvation', 12, NULL),
  ('Kill Team', '2021', 'Nightmare', 13, NULL),
  ('Kill Team', '2021', 'Termination', 14, NULL),
  ('Kill Team', '2024', 'Starter Set', 1, 2024),
  ('Kill Team', '2024', 'Hivestorm', 2, NULL),
  ('Kill Team', '2024', 'Brutal and Cunning', 3, NULL),
  ('Kill Team', '2024', 'Blood and Zeal', 4, NULL),
  ('Kill Team', '2024', 'Typhon', 5, NULL),
  ('Kill Team', '2024', 'Tomb World', 6, NULL),
  ('Kill Team', '2024', 'Dead Silence', 7, NULL),
  ('Kill Team', '2024', 'Warhammer Heroes', 8, NULL)
) AS exp(game_name, edition_name, name, sequence, year)
JOIN edition_ids e ON e.game_name = exp.game_name AND e.edition_name = exp.edition_name
ON CONFLICT DO NOTHING;
