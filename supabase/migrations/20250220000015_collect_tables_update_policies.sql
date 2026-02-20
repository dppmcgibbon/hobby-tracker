-- Allow authenticated users to update collect tables
CREATE POLICY "Authenticated users can update boardgames"
  ON public.boardgames FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can update magazines"
  ON public.magazines FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can update records"
  ON public.records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can update stories"
  ON public.stories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
