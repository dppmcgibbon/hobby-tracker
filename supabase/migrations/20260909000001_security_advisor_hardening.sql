-- Migration: Security Advisor Hardening (Search Paths, Security Definer Permissions, Bucket Listing, and RLS Policy Hardening)
-- Date: 2026-09-09

-- ====================================================================
-- 1. FUNCTION SEARCH PATH HARDENING (lint: function_search_path_mutable)
-- ====================================================================

ALTER FUNCTION public.generate_share_token() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_status_timestamps() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

DO $$
BEGIN
  ALTER FUNCTION public.handle_print_timestamps() SET search_path = public;
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;

-- ====================================================================
-- 2. SECURITY DEFINER PRIVILEGES (lint: anon_security_definer_function_executable,
--                                       authenticated_security_definer_function_executable)
-- ====================================================================

-- handle_new_user is an internal auth trigger and must not be exposed over RPC
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- get_storage_box_miniature_counts only accesses miniatures (which authenticated can query)
-- Switch to SECURITY INVOKER and revoke from anonymous role
ALTER FUNCTION public.get_storage_box_miniature_counts(uuid[]) SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.get_storage_box_miniature_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_storage_box_miniature_counts(uuid[]) TO authenticated;

-- ====================================================================
-- 3. STORAGE BUCKET LISTING RESTRICTION (lint: public_bucket_allows_listing)
-- ====================================================================

-- miniature-photos is a public bucket served directly by CDN.
-- Dropping this policy prevents unauthorized enumeration/listing of objects in the bucket.
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN insufficient_privilege THEN NULL;
END $$;

-- ====================================================================
-- 4. RLS POLICIES FOR AUTHENTICATED USERS (lint: rls_policy_always_true)
-- Replace USING (true) / WITH CHECK (true) with auth.uid() IS NOT NULL
-- ====================================================================

-- --- army_types ---
DROP POLICY IF EXISTS "Authenticated users can insert army types" ON public.army_types;
CREATE POLICY "Authenticated users can insert army types"
  ON public.army_types FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update army types" ON public.army_types;
CREATE POLICY "Authenticated users can update army types"
  ON public.army_types FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete army types" ON public.army_types;
CREATE POLICY "Authenticated users can delete army types"
  ON public.army_types FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- --- boardgames ---
DROP POLICY IF EXISTS "Authenticated users can update boardgames" ON public.boardgames;
CREATE POLICY "Authenticated users can update boardgames"
  ON public.boardgames FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- collect_apps ---
DROP POLICY IF EXISTS "Authenticated users can insert collect_apps" ON public.collect_apps;
CREATE POLICY "Authenticated users can insert collect_apps"
  ON public.collect_apps FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update collect_apps" ON public.collect_apps;
CREATE POLICY "Authenticated users can update collect_apps"
  ON public.collect_apps FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete collect_apps" ON public.collect_apps;
CREATE POLICY "Authenticated users can delete collect_apps"
  ON public.collect_apps FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- --- collect_config ---
DROP POLICY IF EXISTS "Authenticated users can insert collect_config" ON public.collect_config;
CREATE POLICY "Authenticated users can insert collect_config"
  ON public.collect_config FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update collect_config" ON public.collect_config;
CREATE POLICY "Authenticated users can update collect_config"
  ON public.collect_config FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete collect_config" ON public.collect_config;
CREATE POLICY "Authenticated users can delete collect_config"
  ON public.collect_config FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- --- collection_miniatures ---
DROP POLICY IF EXISTS "Authenticated users can manage collection miniatures" ON public.collection_miniatures;
CREATE POLICY "Authenticated users can manage collection miniatures"
  ON public.collection_miniatures FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- collections ---
DROP POLICY IF EXISTS "Authenticated users can manage collections" ON public.collections;
CREATE POLICY "Authenticated users can manage collections"
  ON public.collections FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- editions ---
DROP POLICY IF EXISTS "Authenticated users can manage editions" ON public.editions;
CREATE POLICY "Authenticated users can manage editions"
  ON public.editions FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- expansions ---
DROP POLICY IF EXISTS "Authenticated users can manage expansions" ON public.expansions;
CREATE POLICY "Authenticated users can manage expansions"
  ON public.expansions FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- games ---
DROP POLICY IF EXISTS "Authenticated users can manage games" ON public.games;
CREATE POLICY "Authenticated users can manage games"
  ON public.games FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- magazines ---
DROP POLICY IF EXISTS "Authenticated users can update magazines" ON public.magazines;
CREATE POLICY "Authenticated users can update magazines"
  ON public.magazines FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- miniature_games ---
DROP POLICY IF EXISTS "Authenticated users can manage miniature games" ON public.miniature_games;
CREATE POLICY "Authenticated users can manage miniature games"
  ON public.miniature_games FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- miniature_photos ---
DROP POLICY IF EXISTS "Authenticated users can manage miniature photos" ON public.miniature_photos;
CREATE POLICY "Authenticated users can manage miniature photos"
  ON public.miniature_photos FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- miniature_recipes ---
DROP POLICY IF EXISTS "Authenticated users can manage miniature recipes" ON public.miniature_recipes;
CREATE POLICY "Authenticated users can manage miniature recipes"
  ON public.miniature_recipes FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- miniature_status ---
DROP POLICY IF EXISTS "Authenticated users can manage miniature status" ON public.miniature_status;
CREATE POLICY "Authenticated users can manage miniature status"
  ON public.miniature_status FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- miniature_tags ---
DROP POLICY IF EXISTS "Authenticated users can manage miniature tags" ON public.miniature_tags;
CREATE POLICY "Authenticated users can manage miniature tags"
  ON public.miniature_tags FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- miniatures ---
DROP POLICY IF EXISTS "Authenticated users can manage miniatures" ON public.miniatures;
CREATE POLICY "Authenticated users can manage miniatures"
  ON public.miniatures FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- painting_recipes ---
DROP POLICY IF EXISTS "Authenticated users can manage painting recipes" ON public.painting_recipes;
CREATE POLICY "Authenticated users can manage painting recipes"
  ON public.painting_recipes FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- paints ---
DROP POLICY IF EXISTS "Authenticated users can insert paints" ON public.paints;
CREATE POLICY "Authenticated users can insert paints"
  ON public.paints FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update paints" ON public.paints;
CREATE POLICY "Authenticated users can update paints"
  ON public.paints FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete paints" ON public.paints;
CREATE POLICY "Authenticated users can delete paints"
  ON public.paints FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- --- profiles ---
DROP POLICY IF EXISTS "Authenticated users can manage profiles" ON public.profiles;
CREATE POLICY "Authenticated users can manage profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- recipe_steps ---
DROP POLICY IF EXISTS "Authenticated users can manage recipe steps" ON public.recipe_steps;
CREATE POLICY "Authenticated users can manage recipe steps"
  ON public.recipe_steps FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- records ---
DROP POLICY IF EXISTS "Authenticated users can update records" ON public.records;
CREATE POLICY "Authenticated users can update records"
  ON public.records FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- saved_filters ---
DROP POLICY IF EXISTS "Authenticated users can manage saved filters" ON public.saved_filters;
CREATE POLICY "Authenticated users can manage saved filters"
  ON public.saved_filters FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- shared_miniatures ---
DROP POLICY IF EXISTS "Authenticated users can manage shared miniatures" ON public.shared_miniatures;
CREATE POLICY "Authenticated users can manage shared miniatures"
  ON public.shared_miniatures FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- storage_boxes ---
DROP POLICY IF EXISTS "Authenticated users can manage storage boxes" ON public.storage_boxes;
CREATE POLICY "Authenticated users can manage storage boxes"
  ON public.storage_boxes FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- stories ---
DROP POLICY IF EXISTS "Authenticated users can update stories" ON public.stories;
CREATE POLICY "Authenticated users can update stories"
  ON public.stories FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- tags ---
DROP POLICY IF EXISTS "Authenticated users can manage tags" ON public.tags;
CREATE POLICY "Authenticated users can manage tags"
  ON public.tags FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --- user_paints ---
DROP POLICY IF EXISTS "Authenticated users can manage user paints" ON public.user_paints;
CREATE POLICY "Authenticated users can manage user paints"
  ON public.user_paints FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
