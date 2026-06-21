-- Field execution: service reports, extended photo types, employee task events

ALTER TYPE public.photo_type ADD VALUE IF NOT EXISTS 'signature';
ALTER TYPE public.photo_type ADD VALUE IF NOT EXISTS 'evidence';

DO $$ BEGIN
  CREATE TYPE public.service_report_status AS ENUM ('draft', 'pending_signature', 'signed', 'generated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.service_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  check_in_id uuid REFERENCES public.check_ins (id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  status public.service_report_status NOT NULL DEFAULT 'draft',
  client_name text,
  client_signature_path text,
  storage_path text,
  metadata jsonb NOT NULL DEFAULT '{}',
  signed_at timestamptz,
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_reports_task_unique UNIQUE (task_id, check_in_id)
);

CREATE INDEX IF NOT EXISTS idx_service_reports_company ON public.service_reports (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_reports_task ON public.service_reports (task_id);

CREATE TRIGGER service_reports_set_updated_at
  BEFORE UPDATE ON public.service_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.service_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_reports_select_member" ON public.service_reports;
CREATE POLICY "service_reports_select_member"
  ON public.service_reports FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

DROP POLICY IF EXISTS "service_reports_insert_member" ON public.service_reports;
CREATE POLICY "service_reports_insert_member"
  ON public.service_reports FOR INSERT TO authenticated
  WITH CHECK (private.is_company_member(company_id));

DROP POLICY IF EXISTS "service_reports_update_member" ON public.service_reports;
CREATE POLICY "service_reports_update_member"
  ON public.service_reports FOR UPDATE TO authenticated
  USING (private.is_company_member(company_id))
  WITH CHECK (private.is_company_member(company_id));

-- Employees can log field execution events on assigned tasks
CREATE POLICY "task_events_insert_assigned_employee"
  ON public.task_events FOR INSERT TO authenticated
  WITH CHECK (
    private.is_company_member(company_id)
    AND private.is_task_assigned(task_id)
  );
