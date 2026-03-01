-- Add image_updated_at so we can cache-bust image URLs when the file is replaced (e.g. after background removal)
ALTER TABLE public.miniature_photos
ADD COLUMN IF NOT EXISTS image_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.miniature_photos.image_updated_at IS 'Set when the storage file is replaced (e.g. after background removal); used for cache-busting the image URL';
