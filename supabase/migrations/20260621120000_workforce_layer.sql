-- Workforce layer: HR extensions, vacations, absences, time account, documents

ALTER TYPE public.employee_status ADD VALUE IF NOT EXISTS 'on_vacation';
ALTER TYPE public.employee_status ADD VALUE IF NOT EXISTS 'absent';

DO $$ BEGIN
  CREATE TYPE public.vacation_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.absence_type AS ENUM ('sick', 'leave', 'absence', 'training', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.employee_document_type AS ENUM ('contract', 'certificate', 'training', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.time_account_source AS ENUM ('check_in', 'manual', 'vacation', 'adjustment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS supervisor_id uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contract_type text DEFAULT 'full_time',
  ADD COLUMN IF NOT EXISTS weekly_hours numeric(5, 2) NOT NULL DEFAULT 40;

CREATE INDEX IF NOT EXISTS idx_employees_supervisor ON public.employees (supervisor_id) WHERE supervisor_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.vacation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status public.vacation_status NOT NULL DEFAULT 'pending',
  notes text,
  approved_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vacation_dates_valid CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_vacation_requests_company ON public.vacation_requests (company_id, status);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_employee ON public.vacation_requests (employee_id, start_date);

CREATE TABLE IF NOT EXISTS public.employee_absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
  absence_type public.absence_type NOT NULL DEFAULT 'sick',
  start_date date NOT NULL,
  end_date date NOT NULL,
  notes text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT absence_dates_valid CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_employee_absences_company ON public.employee_absences (company_id, start_date);
CREATE INDEX IF NOT EXISTS idx_employee_absences_employee ON public.employee_absences (employee_id, start_date);

CREATE TABLE IF NOT EXISTS public.worktime_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies (id) ON DELETE CASCADE,
  work_start time NOT NULL DEFAULT '08:00',
  work_end time NOT NULL DEFAULT '17:00',
  break_minutes integer NOT NULL DEFAULT 30,
  max_daily_hours numeric(5, 2) NOT NULL DEFAULT 10,
  max_weekly_hours numeric(5, 2) NOT NULL DEFAULT 48,
  overtime_threshold_hours numeric(5, 2) NOT NULL DEFAULT 8,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.time_account_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  soll_minutes integer NOT NULL DEFAULT 0,
  ist_minutes integer NOT NULL DEFAULT 0,
  balance_delta_minutes integer NOT NULL DEFAULT 0,
  source public.time_account_source NOT NULL DEFAULT 'check_in',
  source_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_account_employee ON public.time_account_entries (employee_id, entry_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_time_account_check_in_unique
  ON public.time_account_entries (source_id)
  WHERE source = 'check_in' AND source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
  doc_type public.employee_document_type NOT NULL DEFAULT 'other',
  title text NOT NULL,
  storage_path text,
  file_name text,
  mime_type text,
  expires_at date,
  uploaded_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON public.employee_documents (employee_id, created_at DESC);

CREATE TRIGGER vacation_requests_set_updated_at
  BEFORE UPDATE ON public.vacation_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER worktime_policies_set_updated_at
  BEFORE UPDATE ON public.worktime_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.vacation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worktime_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_account_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vacation_requests_select_member"
  ON public.vacation_requests FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "vacation_requests_write_supervisor"
  ON public.vacation_requests FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "employee_absences_select_member"
  ON public.employee_absences FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "employee_absences_write_supervisor"
  ON public.employee_absences FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "worktime_policies_select_member"
  ON public.worktime_policies FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "worktime_policies_write_supervisor"
  ON public.worktime_policies FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "time_account_select_member"
  ON public.time_account_entries FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "time_account_write_supervisor"
  ON public.time_account_entries FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "employee_documents_select_member"
  ON public.employee_documents FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "employee_documents_write_supervisor"
  ON public.employee_documents FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));
