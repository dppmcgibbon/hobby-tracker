-- Drop the CHECK constraint that limits army types
ALTER TABLE public.factions DROP CONSTRAINT IF EXISTS factions_army_type_check;
