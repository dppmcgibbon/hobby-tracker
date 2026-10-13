-- Enable write policies for authenticated users on miniature_statuses lookup table

DROP POLICY IF EXISTS "Authenticated users can insert miniature statuses" ON public.miniature_statuses;
CREATE POLICY "Authenticated users can insert miniature statuses"
  ON public.miniature_statuses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update miniature statuses" ON public.miniature_statuses;
CREATE POLICY "Authenticated users can update miniature statuses"
  ON public.miniature_statuses FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete miniature statuses" ON public.miniature_statuses;
CREATE POLICY "Authenticated users can delete miniature statuses"
  ON public.miniature_statuses FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);
