
-- Audit log for time entry changes
CREATE TABLE public.time_entry_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  changed_by uuid NOT NULL,
  change_type text NOT NULL, -- 'create', 'update', 'approve', 'reject', 'correct'
  old_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.time_entry_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage audit_log" ON public.time_entry_audit_log
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Employees can view audit log for their own entries
CREATE POLICY "Employees can view own audit_log" ON public.time_entry_audit_log
  FOR SELECT TO authenticated
  USING (employee_id IN (
    SELECT e.id FROM public.employees e WHERE e.user_id = auth.uid()
  ));

-- Employees can insert audit entries for their own changes
CREATE POLICY "Employees can insert own audit_log" ON public.time_entry_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id IN (SELECT e.id FROM public.employees e WHERE e.user_id = auth.uid())
    AND changed_by = auth.uid()
  );

-- Index for fast lookups
CREATE INDEX idx_audit_log_time_entry ON public.time_entry_audit_log(time_entry_id);
CREATE INDEX idx_audit_log_employee ON public.time_entry_audit_log(employee_id);
