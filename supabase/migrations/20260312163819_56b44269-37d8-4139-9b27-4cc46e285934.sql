CREATE TABLE public.schedule_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  assignments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.schedule_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read schedule_archives" ON public.schedule_archives
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage schedule_archives" ON public.schedule_archives
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
