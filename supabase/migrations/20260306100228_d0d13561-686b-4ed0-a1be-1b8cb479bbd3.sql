
-- Business settings table
CREATE TABLE public.business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  address text DEFAULT '',
  phone text DEFAULT '',
  url text DEFAULT '',
  contact_person text DEFAULT '',
  vat_number text DEFAULT '',
  opening_days text DEFAULT '',
  opening_hours text DEFAULT '',
  social_charges_percent numeric DEFAULT 15.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read business_settings" ON public.business_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage business_settings" ON public.business_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Monthly budget table
CREATE TABLE public.monthly_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL,
  total_revenue numeric NOT NULL DEFAULT 0,
  distribution_mode text NOT NULL DEFAULT 'linear',
  day_weights jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(year, month)
);

ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read monthly_budgets" ON public.monthly_budgets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage monthly_budgets" ON public.monthly_budgets FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
