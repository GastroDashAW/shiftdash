
-- Create storage bucket for form templates
INSERT INTO storage.buckets (id, name, public) VALUES ('form-templates', 'form-templates', false);

-- RLS: Admins can manage templates
CREATE POLICY "Admins can upload templates" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'form-templates' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view templates" ON storage.objects FOR SELECT USING (bucket_id = 'form-templates' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete templates" ON storage.objects FOR DELETE USING (bucket_id = 'form-templates' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update templates" ON storage.objects FOR UPDATE USING (bucket_id = 'form-templates' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Table to track uploaded templates with metadata
CREATE TABLE public.form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  employee_type employee_type NOT NULL DEFAULT 'fixed',
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage templates" ON public.form_templates FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "All authenticated can view templates" ON public.form_templates FOR SELECT USING (auth.uid() IS NOT NULL);
