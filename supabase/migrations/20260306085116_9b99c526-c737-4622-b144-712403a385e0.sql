
-- Add cost_center and position to employees
ALTER TABLE public.employees ADD COLUMN cost_center text NOT NULL DEFAULT '';
ALTER TABLE public.employees ADD COLUMN position text NOT NULL DEFAULT '';

-- Create schedule_events table for events/holidays per day
CREATE TABLE public.schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(date)
);

ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read schedule_events" ON public.schedule_events FOR SELECT TO anon USING (true);
CREATE POLICY "Public can insert schedule_events" ON public.schedule_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can update schedule_events" ON public.schedule_events FOR UPDATE TO anon USING (true);
CREATE POLICY "Public can delete schedule_events" ON public.schedule_events FOR DELETE TO anon USING (true);
