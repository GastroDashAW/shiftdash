
-- Allow public (anon) access to employees table
CREATE POLICY "Public can read employees" ON public.employees FOR SELECT TO anon USING (true);
CREATE POLICY "Public can insert employees" ON public.employees FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can update employees" ON public.employees FOR UPDATE TO anon USING (true);
CREATE POLICY "Public can delete employees" ON public.employees FOR DELETE TO anon USING (true);

-- Same for time_entries
CREATE POLICY "Public can read time_entries" ON public.time_entries FOR SELECT TO anon USING (true);
CREATE POLICY "Public can insert time_entries" ON public.time_entries FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can update time_entries" ON public.time_entries FOR UPDATE TO anon USING (true);

-- Same for monthly_summaries
CREATE POLICY "Public can read monthly_summaries" ON public.monthly_summaries FOR SELECT TO anon USING (true);
CREATE POLICY "Public can insert monthly_summaries" ON public.monthly_summaries FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can update monthly_summaries" ON public.monthly_summaries FOR UPDATE TO anon USING (true);
