-- Paint equivalents: links paints across brands (e.g. Army Painter -> Citadel)
-- Used for conversion charts and "equivalent colour" display

CREATE TABLE IF NOT EXISTS public.paint_equivalents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paint_id UUID REFERENCES public.paints(id) ON DELETE CASCADE NOT NULL,
  equivalent_paint_id UUID REFERENCES public.paints(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(paint_id, equivalent_paint_id)
);

ALTER TABLE public.paint_equivalents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view paint equivalents"
  ON public.paint_equivalents
  FOR SELECT
  USING (true);

CREATE INDEX idx_paint_equivalents_paint_id ON public.paint_equivalents(paint_id);
CREATE INDEX idx_paint_equivalents_equivalent_id ON public.paint_equivalents(equivalent_paint_id);
