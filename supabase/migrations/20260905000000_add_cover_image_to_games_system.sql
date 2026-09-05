-- Add cover_image to games, editions, and expansions
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE public.editions ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE public.expansions ADD COLUMN IF NOT EXISTS cover_image TEXT;
