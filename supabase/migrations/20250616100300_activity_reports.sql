-- Activity logs & reports

CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action public.activity_action NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_logs_company_created ON public.activity_logs (company_id, created_at DESC);
CREATE INDEX idx_activity_logs_entity ON public.activity_logs (entity_type, entity_id);
CREATE INDEX idx_activity_logs_user ON public.activity_logs (user_id, created_at DESC);

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  report_type public.report_type NOT NULL,
  title text NOT NULL,
  period_start date,
  period_end date,
  storage_path text,
  file_size integer,
  generated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_reports_company ON public.reports (company_id, generated_at DESC);
CREATE INDEX idx_reports_type ON public.reports (company_id, report_type);
