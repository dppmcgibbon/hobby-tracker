-- Add completed field to storage_boxes table
ALTER TABLE public.storage_boxes
  ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;

-- Create index for completed field (useful for filtering)
CREATE INDEX IF NOT EXISTS idx_storage_boxes_completed ON public.storage_boxes(completed);
