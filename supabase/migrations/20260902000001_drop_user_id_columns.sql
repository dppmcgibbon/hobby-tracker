-- Migration: Drop user_id columns from public tables
-- Single-user architecture: authentication is retained for system access,
-- but public entity tables do not store user_id.

-- 1. Replace compound unique constraints & indexes that referenced user_id
ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS tags_user_id_name_key;
ALTER TABLE public.tags ADD CONSTRAINT tags_name_key UNIQUE (name);

ALTER TABLE public.saved_filters DROP CONSTRAINT IF EXISTS unique_user_filter_name;
ALTER TABLE public.saved_filters ADD CONSTRAINT saved_filters_name_key UNIQUE (name);

DROP INDEX IF EXISTS public.idx_saved_filters_user_starred;
CREATE INDEX IF NOT EXISTS idx_saved_filters_is_starred ON public.saved_filters (is_starred);

ALTER TABLE public.user_paints DROP CONSTRAINT IF EXISTS user_paints_user_id_paint_id_key;
ALTER TABLE public.user_paints ADD CONSTRAINT user_paints_paint_id_key UNIQUE (paint_id);

-- 2. Drop user_id column from all 10 public tables
ALTER TABLE public.miniatures DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.miniature_status DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.miniature_photos DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.collections DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.painting_recipes DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.tags DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_paints DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.storage_boxes DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.saved_filters DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.shared_miniatures DROP COLUMN IF EXISTS user_id;

-- 3. Simplify get_storage_box_miniature_counts RPC function (drop obsolete p_user_id parameter)
DROP FUNCTION IF EXISTS public.get_storage_box_miniature_counts(uuid[], uuid);
DROP FUNCTION IF EXISTS public.get_storage_box_miniature_counts(uuid[]);

CREATE OR REPLACE FUNCTION public.get_storage_box_miniature_counts(p_box_ids uuid[])
RETURNS TABLE(storage_box_id uuid, total_quantity bigint)
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
