-- Create paints table
CREATE TABLE IF NOT EXISTS public.paints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('base', 'layer', 'shade', 'dry', 'technical', 'contrast', 'air', 'spray')),
  color_hex TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand, name)
);

-- Enable Row Level Security
ALTER TABLE public.paints ENABLE ROW LEVEL SECURITY;

-- Create policies (read-only for all authenticated users)
CREATE POLICY "Anyone can view paints"
  ON public.paints
  FOR SELECT
  USING (true);

-- Create indexes
CREATE INDEX idx_paints_brand ON public.paints(brand);
CREATE INDEX idx_paints_type ON public.paints(type);
CREATE INDEX idx_paints_name ON public.paints(name);

-- Create user paint inventory table
CREATE TABLE IF NOT EXISTS public.user_paints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  paint_id UUID REFERENCES public.paints(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, paint_id)
);

-- Enable RLS for user_paints
ALTER TABLE public.user_paints ENABLE ROW LEVEL SECURITY;

-- Create policies for user_paints
CREATE POLICY "Users can view their own paint inventory"
  ON public.user_paints
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own paint inventory"
  ON public.user_paints
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own paint inventory"
  ON public.user_paints
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own paint inventory"
  ON public.user_paints
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for user lookups
CREATE INDEX idx_user_paints_user_id ON public.user_paints(user_id);

-- Apply updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_paints
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();