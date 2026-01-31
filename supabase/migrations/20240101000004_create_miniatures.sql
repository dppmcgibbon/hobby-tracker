-- Create miniatures table
CREATE TABLE IF NOT EXISTS public.miniatures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  faction_id UUID REFERENCES public.factions(id) ON DELETE SET NULL,
  unit_type TEXT,
  quantity INTEGER DEFAULT 1,
  material TEXT,
  base_size TEXT,
  sculptor TEXT,
  year INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.miniatures ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own miniatures"
  ON public.miniatures
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own miniatures"
  ON public.miniatures
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own miniatures"
  ON public.miniatures
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own miniatures"
  ON public.miniatures
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_miniatures_user_id ON public.miniatures(user_id);
CREATE INDEX idx_miniatures_faction_id ON public.miniatures(faction_id);
CREATE INDEX idx_miniatures_created_at ON public.miniatures(created_at DESC);

-- Apply updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.miniatures
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create miniature_status table
CREATE TABLE IF NOT EXISTS public.miniature_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  miniature_id UUID REFERENCES public.miniatures(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'assembled', 'primed', 'painting', 'completed')),
  magnetised BOOLEAN DEFAULT false,
  based BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.miniature_status ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own miniature status"
  ON public.miniature_status
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own miniature status"
  ON public.miniature_status
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own miniature status"
  ON public.miniature_status
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own miniature status"
  ON public.miniature_status
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_miniature_status_user_id ON public.miniature_status(user_id);
CREATE INDEX idx_miniature_status_miniature_id ON public.miniature_status(miniature_id);
CREATE INDEX idx_miniature_status_status ON public.miniature_status(status);

-- Apply updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.miniature_status
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to auto-set started_at and completed_at
CREATE OR REPLACE FUNCTION public.handle_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Set started_at when moving from backlog
  IF OLD.status = 'backlog' AND NEW.status != 'backlog' AND NEW.started_at IS NULL THEN
    NEW.started_at = NOW();
  END IF;
  
  -- Set completed_at when moving to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  
  -- Clear completed_at when moving away from completed
  IF NEW.status != 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply status timestamp trigger
CREATE TRIGGER set_status_timestamps
  BEFORE UPDATE ON public.miniature_status
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_status_timestamps();