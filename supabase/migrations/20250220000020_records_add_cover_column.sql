-- Add cover column to records so image-type column can store URLs (used by collect_config cover/image).
ALTER TABLE public.records
  ADD COLUMN IF NOT EXISTS cover TEXT;
