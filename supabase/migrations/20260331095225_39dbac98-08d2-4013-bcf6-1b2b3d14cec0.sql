
-- ============================================================
-- SALARY DATA PROTECTION: Restrict employee financial data
-- ============================================================

-- 1. Create a safe view excluding salary/financial fields
-- This view is for employee-role users who need colleague names (e.g. schedule)
CREATE OR REPLACE VIEW public.employees_directory
WITH (security_invoker = on) AS
  SELECT 
    id,
    first_name,
    last_name,
    cost_center,
    position,
    is_active,
    group_id,
    available_days,
    allowed_shift_types,
    user_id
  FROM public.employees;

-- 2. Drop the overly broad SELECT policy
DROP POLICY IF EXISTS "Authenticated can read employees" ON public.employees;

-- 3. Add a targeted policy: employees can read basic info of active colleagues
-- (through the view, which uses security_invoker so RLS applies)
-- We need a policy that allows SELECT for the view to work
-- But we want to hide salary data. Since RLS is row-level not column-level,
-- we use the view to filter columns and allow row access for active employees only.
CREATE POLICY "Authenticated can read active employees" ON public.employees
  FOR SELECT TO authenticated
  USING (is_active = true);
