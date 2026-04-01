
-- 1. Create licenses table
CREATE TABLE public.licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz
);

ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read own license"
  ON public.licenses FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Service role full access on licenses"
  ON public.licenses FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2. Add columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'license_owner',
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS license_id uuid REFERENCES public.licenses(id);

-- 3. Replace handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _license RECORD;
  _meta jsonb;
BEGIN
  _meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  -- Check for a pending license for this email
  SELECT * INTO _license FROM public.licenses
    WHERE email = NEW.email AND status = 'pending'
    LIMIT 1;

  IF _license.id IS NOT NULL THEN
    -- License-based registration: create profile as license_owner
    INSERT INTO public.profiles (user_id, full_name, email, company_name, role, license_id)
    VALUES (
      NEW.id,
      COALESCE(_meta->>'full_name', ''),
      NEW.email,
      COALESCE(_meta->>'company_name', ''),
      'license_owner',
      _license.id
    );

    -- Activate the license
    UPDATE public.licenses
      SET status = 'active', owner_id = NEW.id, activated_at = now()
      WHERE id = _license.id;

    -- Assign admin role in user_roles
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');

  ELSE
    -- Employee or fallback registration
    INSERT INTO public.profiles (user_id, full_name, email, role, owner_id)
    VALUES (
      NEW.id,
      COALESCE(_meta->>'full_name', ''),
      NEW.email,
      'employee',
      (_meta->>'owner_id')::uuid
    );

    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'employee');
  END IF;

  RETURN NEW;
END;
$$;
