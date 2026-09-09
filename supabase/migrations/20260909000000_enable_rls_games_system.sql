-- Migration: Enable Row Level Security (RLS) for games system tables
-- Description: Enables RLS and configures policies on games, editions, expansions, and miniature_games.
-- Fixes Supabase Security Advisor linter error: rls_disabled_in_public

-- ====================================================================
-- 1. games
-- ====================================================================
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view games" ON public.games;
CREATE POLICY "Anyone can view games"
  ON public.games
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage games" ON public.games;
CREATE POLICY "Authenticated users can manage games"
  ON public.games
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ====================================================================
-- 2. editions
-- ====================================================================
ALTER TABLE public.editions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view editions" ON public.editions;
CREATE POLICY "Anyone can view editions"
  ON public.editions
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage editions" ON public.editions;
CREATE POLICY "Authenticated users can manage editions"
  ON public.editions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ====================================================================
-- 3. expansions
-- ====================================================================
ALTER TABLE public.expansions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view expansions" ON public.expansions;
CREATE POLICY "Anyone can view expansions"
  ON public.expansions
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage expansions" ON public.expansions;
CREATE POLICY "Authenticated users can manage expansions"
  ON public.expansions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ====================================================================
-- 4. miniature_games
-- ====================================================================
ALTER TABLE public.miniature_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage miniature games" ON public.miniature_games;
CREATE POLICY "Authenticated users can manage miniature games"
  ON public.miniature_games
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
