-- Operations layer: services catalog, teams, task extensions, contract→property bridge

DO $$ BEGIN
  CREATE TYPE public.property_type AS ENUM (
    'office', 'condominium', 'retail', 'hotel', 'school', 'warehouse', 'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS property_type public.property_type,
  ADD COLUMN IF NOT EXISTS area_sqm numeric(12, 2);

CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  estimated_duration_minutes integer NOT NULL DEFAULT 60,
  frequency text,
  color text NOT NULL DEFAULT '#6366f1',
  default_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  legacy_service_type public.service_type,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_company ON public.services (company_id, is_active, sort_order);

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name text NOT NULL,
  supervisor_id uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  vehicle_info text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teams_company ON public.teams (company_id, is_active);

CREATE TABLE IF NOT EXISTS public.team_members (
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_employee ON public.team_members (employee_id);

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS address_id uuid REFERENCES public.addresses (id) ON DELETE SET NULL;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.contracts (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_contract ON public.tasks (contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_team_date ON public.tasks (company_id, team_id, scheduled_date);

CREATE TABLE IF NOT EXISTS public.task_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_events_task ON public.task_events (task_id, created_at DESC);

CREATE TRIGGER services_set_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER teams_set_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services_select_member"
  ON public.services FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "services_write_supervisor"
  ON public.services FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "teams_select_member"
  ON public.teams FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "teams_write_supervisor"
  ON public.teams FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "team_members_select_member"
  ON public.team_members FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "team_members_write_supervisor"
  ON public.team_members FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "task_events_select_member"
  ON public.task_events FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "task_events_write_supervisor"
  ON public.task_events FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));
