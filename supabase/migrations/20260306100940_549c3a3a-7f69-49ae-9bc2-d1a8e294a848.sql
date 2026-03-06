
CREATE TABLE public.daily_revenues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  revenue_gross numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 8.1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(date)
);

ALTER TABLE public.daily_revenues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read daily_revenues" ON public.daily_revenues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage daily_revenues" ON public.daily_revenues FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
