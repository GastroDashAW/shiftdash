
CREATE TABLE public.shift_plan_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_type_id UUID NOT NULL REFERENCES public.shift_types(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  required_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE (shift_type_id, day_of_week)
);

ALTER TABLE public.shift_plan_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read shift_plan_config" ON public.shift_plan_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage shift_plan_config" ON public.shift_plan_config
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
