
-- ============================================================
-- RLS HARDENING: Remove overly permissive policies
-- Replace with admin-only or owner-only write access
-- ============================================================

-- 1. EMPLOYEES: Remove broad authenticated write policies
DROP POLICY IF EXISTS "Authenticated can delete employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated can update employees" ON public.employees;
-- Fix: Admin ALL policy was on {public}, move to {authenticated}
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
CREATE POLICY "Admins can manage employees" ON public.employees FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. SCHEDULE_ASSIGNMENTS: Only admins should write
DROP POLICY IF EXISTS "Authenticated can delete schedule_assignments" ON public.schedule_assignments;
DROP POLICY IF EXISTS "Authenticated can insert schedule_assignments" ON public.schedule_assignments;
DROP POLICY IF EXISTS "Authenticated can update schedule_assignments" ON public.schedule_assignments;
CREATE POLICY "Admins can manage schedule_assignments" ON public.schedule_assignments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. SCHEDULE_EVENTS: Only admins should write
DROP POLICY IF EXISTS "Authenticated can delete schedule_events" ON public.schedule_events;
DROP POLICY IF EXISTS "Authenticated can insert schedule_events" ON public.schedule_events;
DROP POLICY IF EXISTS "Authenticated can update schedule_events" ON public.schedule_events;
CREATE POLICY "Admins can manage schedule_events" ON public.schedule_events FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. SHIFT_TYPES: Remove broad write + anon read
DROP POLICY IF EXISTS "Authenticated can delete shift_types" ON public.shift_types;
DROP POLICY IF EXISTS "Authenticated can insert shift_types" ON public.shift_types;
DROP POLICY IF EXISTS "Authenticated can update shift_types" ON public.shift_types;
DROP POLICY IF EXISTS "Anyone can read shift_types" ON public.shift_types;
CREATE POLICY "Admins can manage shift_types" ON public.shift_types FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can read shift_types" ON public.shift_types FOR SELECT TO authenticated
  USING (true);

-- 5. FORM_TEMPLATES: Only admins should write
DROP POLICY IF EXISTS "Authenticated can delete form_templates" ON public.form_templates;
DROP POLICY IF EXISTS "Authenticated can insert form_templates" ON public.form_templates;
DROP POLICY IF EXISTS "Authenticated can update form_templates" ON public.form_templates;
DROP POLICY IF EXISTS "Authenticated can read form_templates" ON public.form_templates;
DROP POLICY IF EXISTS "All authenticated can view templates" ON public.form_templates;
-- Keep "Admins can manage templates" but fix role from {public} to {authenticated}
DROP POLICY IF EXISTS "Admins can manage templates" ON public.form_templates;
CREATE POLICY "Admins can manage form_templates" ON public.form_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can read form_templates" ON public.form_templates FOR SELECT TO authenticated
  USING (true);

-- 6. TIME_ENTRIES: Remove broad write, keep admin + employee-specific
DROP POLICY IF EXISTS "Authenticated can delete time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Authenticated can insert time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Authenticated can update time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Authenticated can read time_entries" ON public.time_entries;
-- Fix admin policy from {public} to {authenticated}
DROP POLICY IF EXISTS "Admins can manage all entries" ON public.time_entries;
CREATE POLICY "Admins can manage time_entries" ON public.time_entries FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
-- Keep employee-specific policies (already correct on {public})

-- 7. MONTHLY_SUMMARIES: Remove broad write, fix admin role
DROP POLICY IF EXISTS "Authenticated can delete monthly_summaries" ON public.monthly_summaries;
DROP POLICY IF EXISTS "Authenticated can insert monthly_summaries" ON public.monthly_summaries;
DROP POLICY IF EXISTS "Authenticated can update monthly_summaries" ON public.monthly_summaries;
DROP POLICY IF EXISTS "Authenticated can read monthly_summaries" ON public.monthly_summaries;
DROP POLICY IF EXISTS "Admins can manage summaries" ON public.monthly_summaries;
CREATE POLICY "Admins can manage monthly_summaries" ON public.monthly_summaries FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
-- Fix employee view policy from {public} to {authenticated}
DROP POLICY IF EXISTS "Employees can view own summaries" ON public.monthly_summaries;
CREATE POLICY "Employees can view own summaries" ON public.monthly_summaries FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- 8. PROFILES: Remove broad write, keep user-specific
DROP POLICY IF EXISTS "Authenticated can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can read profiles" ON public.profiles;
-- Fix admin policy from {public} to {authenticated}
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
-- Fix user policies from {public} to {authenticated}
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- 9. NOTIFICATIONS_LOG: Remove unnecessary insert for authenticated
DROP POLICY IF EXISTS "Authenticated can insert notifications_log" ON public.notifications_log;

-- 10. OVERTIME_VERIFICATIONS: Restrict insert to own employee
DROP POLICY IF EXISTS "Authenticated can insert overtime_verifications" ON public.overtime_verifications;
CREATE POLICY "Employees can insert own overtime_verifications" ON public.overtime_verifications FOR INSERT TO authenticated
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
-- Fix employee view policy role
DROP POLICY IF EXISTS "Employees can view own overtime_verifications" ON public.overtime_verifications;
CREATE POLICY "Employees can view own overtime_verifications" ON public.overtime_verifications FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- 11. USER_ROLES: Fix admin policy from {public} to {authenticated}
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 12. EMPLOYEES: Fix "Employees can view own record" from {public} to {authenticated}
DROP POLICY IF EXISTS "Employees can view own record" ON public.employees;
CREATE POLICY "Employees can view own record" ON public.employees FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
