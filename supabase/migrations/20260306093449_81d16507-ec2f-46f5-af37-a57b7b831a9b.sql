
-- Table for overtime verification requests (clock-out after shift end)
CREATE TABLE public.overtime_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id uuid REFERENCES public.time_entries(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  scheduled_end_time time NOT NULL,
  actual_clock_out timestamptz NOT NULL,
  overtime_minutes integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.overtime_verifications ENABLE ROW LEVEL SECURITY;

-- Admins can manage all
CREATE POLICY "Admins can manage overtime_verifications"
  ON public.overtime_verifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Employees can view own
CREATE POLICY "Employees can view own overtime_verifications"
  ON public.overtime_verifications FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- Authenticated can insert (for clock-out flow)
CREATE POLICY "Authenticated can insert overtime_verifications"
  ON public.overtime_verifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Add adjusted_clock_in to time_entries for shift-adjusted start time
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS adjusted_clock_in timestamptz;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS adjusted_clock_out timestamptz;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS requires_overtime_approval boolean DEFAULT false;
