
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS closed_days jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS auto_sync_schedule boolean DEFAULT false;
