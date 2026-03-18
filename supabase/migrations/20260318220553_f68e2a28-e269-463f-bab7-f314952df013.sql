
-- Create employee_groups table
CREATE TABLE public.employee_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create gav_rules table
CREATE TABLE public.gav_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.employee_groups(id) ON DELETE CASCADE,
  weekly_hours NUMERIC NOT NULL DEFAULT 42,
  max_daily_hours NUMERIC NOT NULL DEFAULT 11,
  max_weekly_hours NUMERIC NOT NULL DEFAULT 50,
  vacation_weeks NUMERIC NOT NULL DEFAULT 5,
  holidays_per_year NUMERIC NOT NULL DEFAULT 6,
  overtime_threshold NUMERIC,
  night_surcharge_pct NUMERIC NOT NULL DEFAULT 25,
  sunday_surcharge_pct NUMERIC NOT NULL DEFAULT 50,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id)
);

-- Add group_id to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.employee_groups(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.employee_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gav_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for employee_groups
CREATE POLICY "Admins can manage employee_groups" ON public.employee_groups
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can read employee_groups" ON public.employee_groups
  FOR SELECT TO authenticated
  USING (true);

-- RLS policies for gav_rules
CREATE POLICY "Admins can manage gav_rules" ON public.gav_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can read gav_rules" ON public.gav_rules
  FOR SELECT TO authenticated
  USING (true);
