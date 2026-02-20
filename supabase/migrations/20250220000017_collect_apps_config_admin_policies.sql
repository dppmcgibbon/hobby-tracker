-- Allow authenticated users to insert, update, delete collect_apps and collect_config (admin)
CREATE POLICY "Authenticated users can insert collect_apps"
  ON public.collect_apps FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update collect_apps"
  ON public.collect_apps FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete collect_apps"
  ON public.collect_apps FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert collect_config"
  ON public.collect_config FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update collect_config"
  ON public.collect_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete collect_config"
  ON public.collect_config FOR DELETE TO authenticated USING (true);
