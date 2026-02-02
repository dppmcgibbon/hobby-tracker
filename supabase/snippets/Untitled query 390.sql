-- Create storage_boxes table
CREATE TABLE IF NOT EXISTS storage_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS storage_boxes_user_id_idx ON storage_boxes(user_id);
CREATE INDEX IF NOT EXISTS storage_boxes_name_idx ON storage_boxes(name);

-- Enable RLS
ALTER TABLE storage_boxes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own storage boxes"
    ON storage_boxes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own storage boxes"
    ON storage_boxes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own storage boxes"
    ON storage_boxes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own storage boxes"
    ON storage_boxes FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_storage_boxes_updated_at
    BEFORE UPDATE ON storage_boxes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();