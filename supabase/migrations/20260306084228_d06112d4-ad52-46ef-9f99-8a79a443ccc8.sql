
-- Shift types table
CREATE TABLE public.shift_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_code text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  start_time time,
  end_time time,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shift_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read shift_types" ON public.shift_types FOR SELECT TO anon USING (true);
CREATE POLICY "Public can insert shift_types" ON public.shift_types FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can update shift_types" ON public.shift_types FOR UPDATE TO anon USING (true);
CREATE POLICY "Public can delete shift_types" ON public.shift_types FOR DELETE TO anon USING (true);

-- Insert 8 default shifts
INSERT INTO public.shift_types (name, short_code, color, start_time, end_time, sort_order) VALUES
  ('Frühdienst', 'F', '#22c55e', '06:00', '14:00', 1),
  ('Spätdienst', 'S', '#3b82f6', '14:00', '22:00', 2),
  ('Nachtdienst', 'N', '#6366f1', '22:00', '06:00', 3),
  ('Teildienst', 'T', '#f59e0b', '10:00', '14:00', 4),
  ('Zimmerstunde', 'Z', '#ec4899', '06:00', '09:00', 5),
  ('Frei', 'X', '#94a3b8', NULL, NULL, 6),
  ('Ferien', 'V', '#14b8a6', NULL, NULL, 7),
  ('Krank', 'K', '#ef4444', NULL, NULL, 8);

-- Schedule assignments table
CREATE TABLE public.schedule_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  shift_type_id uuid NOT NULL REFERENCES public.shift_types(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);

ALTER TABLE public.schedule_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read schedule_assignments" ON public.schedule_assignments FOR SELECT TO anon USING (true);
CREATE POLICY "Public can insert schedule_assignments" ON public.schedule_assignments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can update schedule_assignments" ON public.schedule_assignments FOR UPDATE TO anon USING (true);
CREATE POLICY "Public can delete schedule_assignments" ON public.schedule_assignments FOR DELETE TO anon USING (true);
