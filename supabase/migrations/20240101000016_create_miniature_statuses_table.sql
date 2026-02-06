-- Drop the old CHECK constraint on status column
ALTER TABLE public.miniature_status 
  DROP CONSTRAINT IF EXISTS miniature_status_status_check;

-- Create miniature_statuses lookup table
CREATE TABLE IF NOT EXISTS public.miniature_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert status values in the specified order
INSERT INTO public.miniature_statuses (name, display_order) VALUES
  ('unknown', 1),
  ('missing', 2),
  ('needs_stripped', 3),
  ('backlog', 4),
  ('built', 5),
  ('primed', 6),
  ('painting_started', 7),
  ('needs_repair', 8),
  ('sub_assembled', 9),
  ('missing_arm', 10),
  ('missing_leg', 11),
  ('missing_head', 12),
  ('complete', 13);

-- Enable Row Level Security
ALTER TABLE public.miniature_statuses ENABLE ROW LEVEL SECURITY;

-- Create policy for read access
CREATE POLICY "Anyone can view miniature statuses"
  ON public.miniature_statuses
  FOR SELECT
  USING (true);

-- Add index for ordering
CREATE INDEX IF NOT EXISTS idx_miniature_statuses_display_order 
  ON public.miniature_statuses(display_order);

-- Update miniature_status table to use foreign key reference
-- First, add the new column
ALTER TABLE public.miniature_status 
  ADD COLUMN IF NOT EXISTS status_id UUID REFERENCES public.miniature_statuses(id) ON DELETE SET NULL;

-- Migrate existing status values to the new system
-- Map old enum values to new status IDs
UPDATE public.miniature_status ms
SET status_id = (
  SELECT id FROM public.miniature_statuses 
  WHERE name = CASE ms.status
    WHEN 'assembled' THEN 'built'
    WHEN 'completed' THEN 'complete'
    ELSE ms.status
  END
)
WHERE ms.status_id IS NULL;

-- Create index on status_id
CREATE INDEX IF NOT EXISTS idx_miniature_status_status_id 
  ON public.miniature_status(status_id);

-- Update the status timestamp trigger function to handle new statuses
CREATE OR REPLACE FUNCTION public.handle_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Set started_at when moving from backlog or unknown
  IF (OLD.status IN ('backlog', 'unknown') AND NEW.status NOT IN ('backlog', 'unknown') AND NEW.started_at IS NULL) THEN
    NEW.started_at = NOW();
  END IF;
  
  -- Set completed_at when moving to complete
  IF NEW.status = 'complete' AND OLD.status != 'complete' THEN
    NEW.completed_at = NOW();
  END IF;
  
  -- Clear completed_at when moving away from complete
  IF NEW.status != 'complete' AND OLD.status = 'complete' THEN
    NEW.completed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: We'll keep the old 'status' column for now as a fallback during migration
-- It can be removed in a future migration once all data is verified
