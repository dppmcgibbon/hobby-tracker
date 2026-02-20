-- Normalize magazine names: some rows had trailing spaces (e.g. "Combat Patrol ")
-- which caused duplicate filter options in the magazines collect app.
UPDATE public.magazines
SET magazine = TRIM(magazine);
