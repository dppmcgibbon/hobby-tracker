-- Create painting_recipes table
CREATE TABLE IF NOT EXISTS public.painting_recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  faction_id UUID REFERENCES public.factions(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.painting_recipes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own recipes"
  ON public.painting_recipes
  FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert their own recipes"
  ON public.painting_recipes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes"
  ON public.painting_recipes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipes"
  ON public.painting_recipes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_painting_recipes_user_id ON public.painting_recipes(user_id);
CREATE INDEX idx_painting_recipes_faction_id ON public.painting_recipes(faction_id);
CREATE INDEX idx_painting_recipes_is_public ON public.painting_recipes(is_public);

-- Apply updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.painting_recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create recipe_steps table
CREATE TABLE IF NOT EXISTS public.recipe_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID REFERENCES public.painting_recipes(id) ON DELETE CASCADE NOT NULL,
  step_order INTEGER NOT NULL,
  paint_id UUID REFERENCES public.paints(id) ON DELETE SET NULL,
  technique TEXT NOT NULL CHECK (technique IN ('base', 'layer', 'shade', 'wash', 'drybrush', 'highlight', 'glaze', 'blend', 'edge_highlight', 'stipple')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recipe_id, step_order)
);

-- Enable Row Level Security
ALTER TABLE public.recipe_steps ENABLE ROW LEVEL SECURITY;

-- Create policies (inherit from recipe policies)
CREATE POLICY "Users can view steps of accessible recipes"
  ON public.recipe_steps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.painting_recipes
      WHERE id = recipe_steps.recipe_id
      AND (user_id = auth.uid() OR is_public = true)
    )
  );

CREATE POLICY "Users can insert steps in their own recipes"
  ON public.recipe_steps
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.painting_recipes
      WHERE id = recipe_steps.recipe_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update steps in their own recipes"
  ON public.recipe_steps
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.painting_recipes
      WHERE id = recipe_steps.recipe_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete steps in their own recipes"
  ON public.recipe_steps
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.painting_recipes
      WHERE id = recipe_steps.recipe_id
      AND user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_recipe_steps_recipe_id ON public.recipe_steps(recipe_id);
CREATE INDEX idx_recipe_steps_step_order ON public.recipe_steps(recipe_id, step_order);

-- Create miniature_recipes junction table
CREATE TABLE IF NOT EXISTS public.miniature_recipes (
  miniature_id UUID REFERENCES public.miniatures(id) ON DELETE CASCADE NOT NULL,
  recipe_id UUID REFERENCES public.painting_recipes(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (miniature_id, recipe_id)
);

-- Enable Row Level Security
ALTER TABLE public.miniature_recipes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own miniature-recipe links"
  ON public.miniature_recipes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.miniatures
      WHERE id = miniature_recipes.miniature_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own miniature-recipe links"
  ON public.miniature_recipes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.miniatures
      WHERE id = miniature_recipes.miniature_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own miniature-recipe links"
  ON public.miniature_recipes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.miniatures
      WHERE id = miniature_recipes.miniature_id
      AND user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_miniature_recipes_miniature_id ON public.miniature_recipes(miniature_id);
CREATE INDEX idx_miniature_recipes_recipe_id ON public.miniature_recipes(recipe_id);