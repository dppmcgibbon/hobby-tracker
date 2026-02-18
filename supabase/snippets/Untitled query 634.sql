-- Create saved_filters 
table CREATE TABLE IF NOT EXISTS public.saved_filters ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, name VARCHAR(255) NOT NULL, filters JSONB NOT NULL, is_starred BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), CONSTRAINT unique_user_filter_name UNIQUE(user_id, name) );



-- Create RLS policies 
CREATE POLICY "Users can view their own saved filters" ON public.saved_filters FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved filters" ON public.saved_filters FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved filters" ON public.saved_filters FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved filters" ON public.saved_filters FOR DELETE USING (auth.uid() = user_id);

-- Add index for performance 
CREATE INDEX IF NOT EXISTS idx_saved_filters_user_starred ON public.saved_filters(user_id, is_starred);