-- Migration: Decouple auth.users from public tables (Single-user system)
-- Date: 2026-09-02

-- ====================================================================
-- 1. DROP FOREIGN KEY CONSTRAINTS TO auth.users(id)
-- ====================================================================
ALTER TABLE public.miniatures DROP CONSTRAINT IF EXISTS miniatures_user_id_fkey;
ALTER TABLE public.miniature_status DROP CONSTRAINT IF EXISTS miniature_status_user_id_fkey;
ALTER TABLE public.miniature_photos DROP CONSTRAINT IF EXISTS miniature_photos_user_id_fkey;
ALTER TABLE public.user_paints DROP CONSTRAINT IF EXISTS user_paints_user_id_fkey;
ALTER TABLE public.painting_recipes DROP CONSTRAINT IF EXISTS painting_recipes_user_id_fkey;
ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS tags_user_id_fkey;
ALTER TABLE public.collections DROP CONSTRAINT IF EXISTS collections_user_id_fkey;
ALTER TABLE public.shared_miniatures DROP CONSTRAINT IF EXISTS shared_miniatures_user_id_fkey;
ALTER TABLE public.storage_boxes DROP CONSTRAINT IF EXISTS storage_boxes_user_id_fkey;
ALTER TABLE public.saved_filters DROP CONSTRAINT IF EXISTS saved_filters_user_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- ====================================================================
-- 2. ADJUST COLUMN NULLABILITY AND DEFAULT VALUES
-- ====================================================================
ALTER TABLE public.miniatures
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.miniature_status
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.miniature_photos
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.user_paints
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.painting_recipes
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.tags
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.collections
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.shared_miniatures
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.storage_boxes
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.saved_filters
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.profiles
  ALTER COLUMN id SET DEFAULT auth.uid();

-- ====================================================================
-- 3. UPDATE ROW LEVEL SECURITY (RLS) POLICIES FOR SINGLE-USER SYSTEM
-- ====================================================================

-- --- profiles ---
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can manage profiles" ON public.profiles;

CREATE POLICY "Authenticated users can manage profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --- miniatures ---
DROP POLICY IF EXISTS "Users can view their own miniatures" ON public.miniatures;
DROP POLICY IF EXISTS "Users can insert their own miniatures" ON public.miniatures;
DROP POLICY IF EXISTS "Users can update their own miniatures" ON public.miniatures;
DROP POLICY IF EXISTS "Users can delete their own miniatures" ON public.miniatures;
DROP POLICY IF EXISTS "Authenticated users can manage miniatures" ON public.miniatures;

CREATE POLICY "Authenticated users can manage miniatures"
  ON public.miniatures
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --- miniature_status ---
DROP POLICY IF EXISTS "Users can view their own miniature status" ON public.miniature_status;
DROP POLICY IF EXISTS "Users can insert their own miniature status" ON public.miniature_status;
DROP POLICY IF EXISTS "Users can update their own miniature status" ON public.miniature_status;
DROP POLICY IF EXISTS "Users can delete their own miniature status" ON public.miniature_status;
DROP POLICY IF EXISTS "Authenticated users can manage miniature status" ON public.miniature_status;

CREATE POLICY "Authenticated users can manage miniature status"
  ON public.miniature_status
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --- miniature_photos ---
DROP POLICY IF EXISTS "Users can view their own miniature photos" ON public.miniature_photos;
DROP POLICY IF EXISTS "Users can insert their own miniature photos" ON public.miniature_photos;
DROP POLICY IF EXISTS "Users can update their own miniature photos" ON public.miniature_photos;
DROP POLICY IF EXISTS "Users can delete their own miniature photos" ON public.miniature_photos;
DROP POLICY IF EXISTS "Authenticated users can manage miniature photos" ON public.miniature_photos;

CREATE POLICY "Authenticated users can manage miniature photos"
  ON public.miniature_photos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --- miniature_recipes ---
DROP POLICY IF EXISTS "Users can view their own miniature-recipe links" ON public.miniature_recipes;
DROP POLICY IF EXISTS "Users can insert their own miniature-recipe links" ON public.miniature_recipes;
DROP POLICY IF EXISTS "Users can delete their own miniature-recipe links" ON public.miniature_recipes;
DROP POLICY IF EXISTS "Authenticated users can manage miniature recipes" ON public.miniature_recipes;

CREATE POLICY "Authenticated users can manage miniature recipes"
  ON public.miniature_recipes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --- miniature_tags ---
DROP POLICY IF EXISTS "Users can view their own miniature tags" ON public.miniature_tags;
DROP POLICY IF EXISTS "Users can create their own miniature tags" ON public.miniature_tags;
DROP POLICY IF EXISTS "Users can delete their own miniature tags" ON public.miniature_tags;
DROP POLICY IF EXISTS "Authenticated users can manage miniature tags" ON public.miniature_tags;

CREATE POLICY "Authenticated users can manage miniature tags"
  ON public.miniature_tags
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --- collections ---
DROP POLICY IF EXISTS "Users can view their own collections" ON public.collections;
DROP POLICY IF EXISTS "Users can create their own collections" ON public.collections;
DROP POLICY IF EXISTS "Users can update their own collections" ON public.collections;
DROP POLICY IF EXISTS "Users can delete their own collections" ON public.collections;
DROP POLICY IF EXISTS "Authenticated users can manage collections" ON public.collections;

CREATE POLICY "Authenticated users can manage collections"
  ON public.collections
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --- collection_miniatures ---
DROP POLICY IF EXISTS "Users can view their own collection miniatures" ON public.collection_miniatures;
DROP POLICY IF EXISTS "Users can add miniatures to their collections" ON public.collection_miniatures;
DROP POLICY IF EXISTS "Users can remove miniatures from their collections" ON public.collection_miniatures;
DROP POLICY IF EXISTS "Authenticated users can manage collection miniatures" ON public.collection_miniatures;

CREATE POLICY "Authenticated users can manage collection miniatures"
  ON public.collection_miniatures
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --- painting_recipes ---
DROP POLICY IF EXISTS "Users can view their own recipes" ON public.painting_recipes;
DROP POLICY IF EXISTS "Users can insert their own recipes" ON public.painting_recipes;
DROP POLICY IF EXISTS "Users can update their own recipes" ON public.painting_recipes;
DROP POLICY IF EXISTS "Users can delete their own recipes" ON public.painting_recipes;
DROP POLICY IF EXISTS "Authenticated users can manage painting recipes" ON public.painting_recipes;
DROP POLICY IF EXISTS "Anyone can view public recipes" ON public.painting_recipes;

CREATE POLICY "Anyone can view public recipes"
  ON public.painting_recipes
  FOR SELECT
  USING (is_public = true);

CREATE POLICY "Authenticated users can manage painting recipes"
  ON public.painting_recipes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --- recipe_steps ---
DROP POLICY IF EXISTS "Users can view steps of accessible recipes" ON public.recipe_steps;
DROP POLICY IF EXISTS "Users can insert steps in their own recipes" ON public.recipe_steps;
DROP POLICY IF EXISTS "Users can update steps in their own recipes" ON public.recipe_steps;
DROP POLICY IF EXISTS "Users can delete steps in their own recipes" ON public.recipe_steps;
DROP POLICY IF EXISTS "Authenticated users can manage recipe steps" ON public.recipe_steps;
DROP POLICY IF EXISTS "Anyone can view steps of public recipes" ON public.recipe_steps;

CREATE POLICY "Anyone can view steps of public recipes"
  ON public.recipe_steps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.painting_recipes
      WHERE id = recipe_steps.recipe_id AND is_public = true
    )
  );

CREATE POLICY "Authenticated users can manage recipe steps"
  ON public.recipe_steps
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --- tags ---
DROP POLICY IF EXISTS "Users can view their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can create their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can delete their own tags" ON public.tags;
DROP POLICY IF EXISTS "Authenticated users can manage tags" ON public.tags;

CREATE POLICY "Authenticated users can manage tags"
  ON public.tags
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --- user_paints ---
DROP POLICY IF EXISTS "Users can view their own paint inventory" ON public.user_paints;
DROP POLICY IF EXISTS "Users can insert their own paint inventory" ON public.user_paints;
DROP POLICY IF EXISTS "Users can update their own paint inventory" ON public.user_paints;
DROP POLICY IF EXISTS "Users can delete their own paint inventory" ON public.user_paints;
DROP POLICY IF EXISTS "Authenticated users can manage user paints" ON public.user_paints;

CREATE POLICY "Authenticated users can manage user paints"
  ON public.user_paints
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --- storage_boxes ---
DROP POLICY IF EXISTS "Users can view their own storage boxes" ON public.storage_boxes;
DROP POLICY IF EXISTS "Users can insert their own storage boxes" ON public.storage_boxes;
DROP POLICY IF EXISTS "Users can update their own storage boxes" ON public.storage_boxes;
DROP POLICY IF EXISTS "Users can delete their own storage boxes" ON public.storage_boxes;
DROP POLICY IF EXISTS "Authenticated users can manage storage boxes" ON public.storage_boxes;

CREATE POLICY "Authenticated users can manage storage boxes"
  ON public.storage_boxes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --- saved_filters ---
DROP POLICY IF EXISTS "Users can view their own saved filters" ON public.saved_filters;
DROP POLICY IF EXISTS "Users can insert their own saved filters" ON public.saved_filters;
DROP POLICY IF EXISTS "Users can update their own saved filters" ON public.saved_filters;
DROP POLICY IF EXISTS "Users can delete their own saved filters" ON public.saved_filters;
DROP POLICY IF EXISTS "Authenticated users can manage saved filters" ON public.saved_filters;

CREATE POLICY "Authenticated users can manage saved filters"
  ON public.saved_filters
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --- shared_miniatures ---
DROP POLICY IF EXISTS "Users can view their own shared miniatures" ON public.shared_miniatures;
DROP POLICY IF EXISTS "Users can create shares for their miniatures" ON public.shared_miniatures;
DROP POLICY IF EXISTS "Users can update their shares" ON public.shared_miniatures;
DROP POLICY IF EXISTS "Users can delete their shares" ON public.shared_miniatures;
DROP POLICY IF EXISTS "Authenticated users can manage shared miniatures" ON public.shared_miniatures;

CREATE POLICY "Authenticated users can manage shared miniatures"
  ON public.shared_miniatures
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ====================================================================
-- 4. UPDATE RPC FUNCTION FOR STORAGE BOX COUNTS
-- ====================================================================
CREATE OR REPLACE FUNCTION get_storage_box_miniature_counts(p_box_ids UUID[], p_user_id UUID DEFAULT NULL)
RETURNS TABLE(storage_box_id UUID, total_quantity BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.storage_box_id,
    COALESCE(SUM(GREATEST(COALESCE(m.quantity, 1), 1)), 0)::BIGINT
  FROM miniatures m
  WHERE m.storage_box_id = ANY(p_box_ids)
    AND m.storage_box_id IS NOT NULL
  GROUP BY m.storage_box_id;
$$;

-- ====================================================================
-- 5. STORAGE BUCKET POLICIES (miniature-photos & backup-imports)
-- ====================================================================
DO $$
BEGIN
  -- miniature-photos storage policies
  DROP POLICY IF EXISTS "Users can upload their own photos" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update photos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;

  CREATE POLICY "Authenticated users can upload photos"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'miniature-photos');

  CREATE POLICY "Authenticated users can update photos"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'miniature-photos');

  CREATE POLICY "Authenticated users can delete photos"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'miniature-photos');

  -- backup-imports storage policies
  DROP POLICY IF EXISTS "Users can upload their own backup imports" ON storage.objects;
  DROP POLICY IF EXISTS "Users can read their own backup imports" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own backup imports" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload backup imports" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can read backup imports" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete backup imports" ON storage.objects;

  CREATE POLICY "Authenticated users can upload backup imports"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'backup-imports');

  CREATE POLICY "Authenticated users can read backup imports"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'backup-imports');

  CREATE POLICY "Authenticated users can delete backup imports"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'backup-imports');
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN insufficient_privilege THEN NULL;
END $$;
