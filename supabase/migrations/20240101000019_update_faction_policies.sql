-- Update RLS policies for factions table to allow write operations

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view factions" ON public.factions;

-- Recreate view policy
CREATE POLICY "Anyone can view factions"
  ON public.factions
  FOR SELECT
  USING (true);

-- Add insert policy (authenticated users can add factions)
CREATE POLICY "Authenticated users can insert factions"
  ON public.factions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add update policy (authenticated users can update factions)
CREATE POLICY "Authenticated users can update factions"
  ON public.factions
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Add delete policy (authenticated users can delete factions)
CREATE POLICY "Authenticated users can delete factions"
  ON public.factions
  FOR DELETE
  USING (auth.uid() IS NOT NULL);
