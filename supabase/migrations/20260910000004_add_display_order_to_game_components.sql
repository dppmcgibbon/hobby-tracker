-- Add display_order column to game_components for custom drag and drop ordering
ALTER TABLE public.game_components
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Index for ordering within a game box
CREATE INDEX IF NOT EXISTS idx_game_components_order 
ON public.game_components(game_box_id, display_order);
