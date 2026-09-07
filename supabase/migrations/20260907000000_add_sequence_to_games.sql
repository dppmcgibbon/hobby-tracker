-- Add sequence column to games table
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS sequence INTEGER;

-- Backfill sequence for existing games partitioned by universe_id ordered by name
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY universe_id ORDER BY name ASC) as new_seq
  FROM public.games
)
UPDATE public.games g
SET sequence = numbered.new_seq
FROM numbered
WHERE g.id = numbered.id AND g.sequence IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_games_sequence ON public.games(sequence);
