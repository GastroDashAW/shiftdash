
ALTER TABLE public.employees 
  ADD COLUMN IF NOT EXISTS pensum_percent numeric DEFAULT 100,
  ADD COLUMN IF NOT EXISTS available_days jsonb DEFAULT '["Mo","Di","Mi","Do","Fr"]'::jsonb;
