-- RPC to get miniature counts (sum of quantities) per storage box
-- Uses COALESCE(quantity, 1) to match detail page logic
-- Restricts to caller's user_id for security
CREATE OR REPLACE FUNCTION get_storage_box_miniature_counts(p_box_ids UUID[], p_user_id UUID)
RETURNS TABLE(storage_box_id UUID, total_quantity BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.storage_box_id,
    COALESCE(SUM(GREATEST(COALESCE(m.quantity, 1), 1)), 0)::BIGINT
  FROM miniatures m
  WHERE m.storage_box_id = ANY(p_box_ids)
    AND m.user_id = p_user_id
    AND m.user_id = auth.uid()
    AND m.storage_box_id IS NOT NULL
  GROUP BY m.storage_box_id;
$$;
