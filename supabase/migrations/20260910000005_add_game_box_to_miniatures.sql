-- Add game_box_id column to miniatures table
ALTER TABLE public.miniatures
ADD COLUMN IF NOT EXISTS game_box_id UUID REFERENCES public.game_boxes(id) ON DELETE SET NULL;

-- Add index for game_box_id
CREATE INDEX IF NOT EXISTS miniatures_game_box_id_idx ON public.miniatures(game_box_id);
