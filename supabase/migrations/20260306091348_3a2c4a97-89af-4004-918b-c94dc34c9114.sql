
-- Fix RLS policies for shift_types: allow authenticated users too
DROP POLICY IF EXISTS "Public can read shift_types" ON public.shift_types;
DROP POLICY IF EXISTS "Public can insert shift_types" ON public.shift_types;
DROP POLICY IF EXISTS "Public can update shift_types" ON public.shift_types;
DROP POLICY IF EXISTS "Public can delete shift_types" ON public.shift_types;

CREATE POLICY "Anyone can read shift_types" ON public.shift_types FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated can insert shift_types" ON public.shift_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update shift_types" ON public.shift_types FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete shift_types" ON public.shift_types FOR DELETE TO authenticated USING (true);

-- Fix RLS policies for employees
DROP POLICY IF EXISTS "Public can read employees" ON public.employees;
DROP POLICY IF EXISTS "Public can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Public can update employees" ON public.employees;
DROP POLICY IF EXISTS "Public can delete employees" ON public.employees;

CREATE POLICY "Authenticated can read employees" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert employees" ON public.employees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update employees" ON public.employees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete employees" ON public.employees FOR DELETE TO authenticated USING (true);

-- Fix RLS policies for schedule_assignments
DROP POLICY IF EXISTS "Public can read schedule_assignments" ON public.schedule_assignments;
DROP POLICY IF EXISTS "Public can insert schedule_assignments" ON public.schedule_assignments;
DROP POLICY IF EXISTS "Public can update schedule_assignments" ON public.schedule_assignments;
DROP POLICY IF EXISTS "Public can delete schedule_assignments" ON public.schedule_assignments;

CREATE POLICY "Authenticated can read schedule_assignments" ON public.schedule_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert schedule_assignments" ON public.schedule_assignments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update schedule_assignments" ON public.schedule_assignments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete schedule_assignments" ON public.schedule_assignments FOR DELETE TO authenticated USING (true);

-- Fix RLS policies for schedule_events
DROP POLICY IF EXISTS "Public can read schedule_events" ON public.schedule_events;
DROP POLICY IF EXISTS "Public can insert schedule_events" ON public.schedule_events;
DROP POLICY IF EXISTS "Public can update schedule_events" ON public.schedule_events;
DROP POLICY IF EXISTS "Public can delete schedule_events" ON public.schedule_events;

CREATE POLICY "Authenticated can read schedule_events" ON public.schedule_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert schedule_events" ON public.schedule_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update schedule_events" ON public.schedule_events FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete schedule_events" ON public.schedule_events FOR DELETE TO authenticated USING (true);

-- Fix RLS policies for time_entries
DROP POLICY IF EXISTS "Public can read time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Public can insert time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Public can update time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Public can delete time_entries" ON public.time_entries;

CREATE POLICY "Authenticated can read time_entries" ON public.time_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert time_entries" ON public.time_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update time_entries" ON public.time_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete time_entries" ON public.time_entries FOR DELETE TO authenticated USING (true);

-- Fix RLS policies for monthly_summaries
DROP POLICY IF EXISTS "Public can read monthly_summaries" ON public.monthly_summaries;
DROP POLICY IF EXISTS "Public can insert monthly_summaries" ON public.monthly_summaries;
DROP POLICY IF EXISTS "Public can update monthly_summaries" ON public.monthly_summaries;
DROP POLICY IF EXISTS "Public can delete monthly_summaries" ON public.monthly_summaries;

CREATE POLICY "Authenticated can read monthly_summaries" ON public.monthly_summaries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert monthly_summaries" ON public.monthly_summaries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update monthly_summaries" ON public.monthly_summaries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete monthly_summaries" ON public.monthly_summaries FOR DELETE TO authenticated USING (true);

-- Fix RLS policies for form_templates
DROP POLICY IF EXISTS "Public can read form_templates" ON public.form_templates;
DROP POLICY IF EXISTS "Public can insert form_templates" ON public.form_templates;
DROP POLICY IF EXISTS "Public can update form_templates" ON public.form_templates;
DROP POLICY IF EXISTS "Public can delete form_templates" ON public.form_templates;

CREATE POLICY "Authenticated can read form_templates" ON public.form_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert form_templates" ON public.form_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update form_templates" ON public.form_templates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete form_templates" ON public.form_templates FOR DELETE TO authenticated USING (true);

-- Fix RLS policies for user_roles and profiles
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Authenticated can read user_roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Authenticated can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update profiles" ON public.profiles FOR UPDATE TO authenticated USING (true);
