-- Create saved_filters table for user-saved miniature filter presets
CREATE TABLE IF NOT EXISTS public.saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  filters JSONB NOT NULL,
  logo_url TEXT,
  is_starred BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_filter_name UNIQUE(user_id, name)
);

-- Add logo_url if table already existed without it (skip if we don't own the table)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'saved_filters' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE public.saved_filters ADD COLUMN logo_url TEXT;
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Users can view their own saved filters" ON public.saved_filters;
DROP POLICY IF EXISTS "Users can insert their own saved filters" ON public.saved_filters;
DROP POLICY IF EXISTS "Users can update their own saved filters" ON public.saved_filters;
DROP POLICY IF EXISTS "Users can delete their own saved filters" ON public.saved_filters;

CREATE POLICY "Users can view their own saved filters"
  ON public.saved_filters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved filters"
  ON public.saved_filters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved filters"
  ON public.saved_filters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved filters"
  ON public.saved_filters FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_filters_user_starred ON public.saved_filters(user_id, is_starred);
