-- Add storage_box_id column to miniatures table
ALTER TABLE miniatures
ADD COLUMN storage_box_id UUID REFERENCES storage_boxes(id) ON DELETE SET NULL;

-- Add index for storage_box_id
CREATE INDEX IF NOT EXISTS miniatures_storage_box_id_idx ON miniatures(storage_box_id);
