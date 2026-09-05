-- Add links JSONB column to games, editions, and expansions
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.editions ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.expansions ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb;
