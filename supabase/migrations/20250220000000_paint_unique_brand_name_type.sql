-- Change paints unique constraint to allow same name with different types
-- (e.g. Death Guard Green Base + Death Guard Green Spray = 2 paints, 2 images)
-- Required for 287 paints matching 287 paint images

ALTER TABLE public.paints DROP CONSTRAINT IF EXISTS paints_brand_name_key;
ALTER TABLE public.paints ADD CONSTRAINT paints_brand_name_type_key UNIQUE (brand, name, type);
