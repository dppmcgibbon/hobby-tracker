-- Create materials table (resin, filament, etc.)
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('resin', 'filament', 'powder')),
  brand TEXT,
  color TEXT,
  color_hex TEXT,
  quantity_ml INTEGER, -- For resin
  quantity_grams INTEGER, -- For filament
  cost_per_unit DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own materials"
  ON public.materials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own materials"
  ON public.materials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own materials"
  ON public.materials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own materials"
  ON public.materials FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_materials_user_id ON public.materials(user_id);
CREATE INDEX idx_materials_type ON public.materials(type);

-- Apply updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create STL files table
CREATE TABLE IF NOT EXISTS public.stl_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  description TEXT,
  source TEXT, -- e.g., "MyMiniFactory", "Thingiverse", "Custom"
  source_url TEXT,
  designer TEXT,
  license TEXT,
  is_supported BOOLEAN DEFAULT false, -- Pre-supported or needs supports
  scale_factor DECIMAL(5,2) DEFAULT 1.0,
  estimated_print_time_minutes INTEGER,
  estimated_material_usage_ml DECIMAL(10,2),
  thumbnail_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.stl_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own STL files"
  ON public.stl_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own STL files"
  ON public.stl_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own STL files"
  ON public.stl_files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own STL files"
  ON public.stl_files FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_stl_files_user_id ON public.stl_files(user_id);
CREATE INDEX idx_stl_files_name ON public.stl_files(name);

-- Apply updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.stl_files
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create print_profiles table (print settings templates)
CREATE TABLE IF NOT EXISTS public.print_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  printer_name TEXT,
  layer_height_mm DECIMAL(5,3),
  exposure_time_seconds DECIMAL(5,2),
  bottom_exposure_time_seconds DECIMAL(5,2),
  bottom_layers INTEGER,
  lift_speed_mm_per_min DECIMAL(8,2),
  retract_speed_mm_per_min DECIMAL(8,2),
  temperature_celsius INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.print_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own print profiles"
  ON public.print_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own print profiles"
  ON public.print_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own print profiles"
  ON public.print_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own print profiles"
  ON public.print_profiles FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_print_profiles_user_id ON public.print_profiles(user_id);

-- Apply updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.print_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create prints table (print jobs/history)
CREATE TABLE IF NOT EXISTS public.prints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stl_file_id UUID REFERENCES public.stl_files(id) ON DELETE SET NULL,
  miniature_id UUID REFERENCES public.miniatures(id) ON DELETE SET NULL,
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  print_profile_id UUID REFERENCES public.print_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'printing', 'completed', 'failed', 'cancelled')),
  quantity INTEGER DEFAULT 1,
  scale_factor DECIMAL(5,2) DEFAULT 1.0,
  print_time_minutes INTEGER,
  material_used_ml DECIMAL(10,2),
  material_cost DECIMAL(10,2),
  failure_reason TEXT,
  notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.prints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own prints"
  ON public.prints FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own prints"
  ON public.prints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prints"
  ON public.prints FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prints"
  ON public.prints FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_prints_user_id ON public.prints(user_id);
CREATE INDEX idx_prints_stl_file_id ON public.prints(stl_file_id);
CREATE INDEX idx_prints_miniature_id ON public.prints(miniature_id);
CREATE INDEX idx_prints_status ON public.prints(status);
CREATE INDEX idx_prints_created_at ON public.prints(created_at DESC);

-- Apply updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.prints
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create stl_tags table for tagging STL files
CREATE TABLE IF NOT EXISTS public.stl_tags (
  stl_file_id UUID REFERENCES public.stl_files(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (stl_file_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.stl_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own STL tags"
  ON public.stl_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stl_files
      WHERE id = stl_tags.stl_file_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own STL tags"
  ON public.stl_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stl_files
      WHERE id = stl_tags.stl_file_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own STL tags"
  ON public.stl_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.stl_files
      WHERE id = stl_tags.stl_file_id
      AND user_id = auth.uid()
    )
  );

CREATE INDEX idx_stl_tags_stl_file_id ON public.stl_tags(stl_file_id);
CREATE INDEX idx_stl_tags_tag_id ON public.stl_tags(tag_id);

-- Function to auto-set print timestamps
CREATE OR REPLACE FUNCTION handle_print_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Set started_at when moving to printing
  IF NEW.status = 'printing' AND OLD.status != 'printing' AND NEW.started_at IS NULL THEN
    NEW.started_at = NOW();
  END IF;
  
  -- Set completed_at when completed or failed
  IF (NEW.status = 'completed' OR NEW.status = 'failed') AND 
     (OLD.status != 'completed' AND OLD.status != 'failed') THEN
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply print timestamp trigger
CREATE TRIGGER set_print_timestamps
  BEFORE UPDATE ON public.prints
  FOR EACH ROW
  EXECUTE FUNCTION handle_print_timestamps();