
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  subscription jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions(user_id);

CREATE POLICY "Users can manage own push subscriptions" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all push subscriptions" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'sent'
);

ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notifications_log" ON public.notifications_log
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can insert notifications_log" ON public.notifications_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS push_reminders_enabled boolean DEFAULT true;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS reminder_minutes_before integer DEFAULT 5;
