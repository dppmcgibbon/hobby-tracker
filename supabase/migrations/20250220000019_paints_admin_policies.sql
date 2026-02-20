-- Allow authenticated users to manage paints (admin: add paints, update hex, etc.)

CREATE POLICY "Authenticated users can insert paints"
  ON public.paints
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update paints"
  ON public.paints
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete paints"
  ON public.paints
  FOR DELETE
  TO authenticated
  USING (true);
