-- Equipment management: catalog, assignments, maintenance, history

DO $$ BEGIN
  CREATE TYPE public.equipment_category AS ENUM ('vehicle', 'tool', 'machine', 'safety', 'consumable', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.equipment_status AS ENUM ('available', 'assigned', 'maintenance', 'retired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.maintenance_type AS ENUM ('preventive', 'corrective', 'inspection', 'calibration');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.maintenance_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.equipment_event_type AS ENUM (
    'created', 'updated', 'assigned', 'returned',
    'maintenance_scheduled', 'maintenance_completed', 'status_changed', 'note'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category public.equipment_category NOT NULL DEFAULT 'tool',
  status public.equipment_status NOT NULL DEFAULT 'available',
  serial_number text,
  asset_tag text,
  manufacturer text,
  model text,
  purchase_date date,
  purchase_cost_cents integer,
  warranty_until date,
  service_id uuid REFERENCES public.services (id) ON DELETE SET NULL,
  default_employee_id uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  location_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_equipment_asset_tag
  ON public.equipment (company_id, asset_tag)
  WHERE asset_tag IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_company ON public.equipment (company_id, status);
CREATE INDEX IF NOT EXISTS idx_equipment_service ON public.equipment (service_id) WHERE service_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.equipment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment (id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks (id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services (id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  returned_at timestamptz,
  notes text,
  assigned_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_assignments_equipment
  ON public.equipment_assignments (equipment_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_active
  ON public.equipment_assignments (company_id, equipment_id)
  WHERE returned_at IS NULL;

CREATE TABLE IF NOT EXISTS public.equipment_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment (id) ON DELETE CASCADE,
  maintenance_type public.maintenance_type NOT NULL DEFAULT 'preventive',
  status public.maintenance_status NOT NULL DEFAULT 'scheduled',
  title text NOT NULL,
  description text,
  scheduled_date date,
  completed_at timestamptz,
  cost_cents integer,
  vendor text,
  next_due_date date,
  performed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_equipment
  ON public.equipment_maintenance (equipment_id, scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_due
  ON public.equipment_maintenance (company_id, next_due_date)
  WHERE next_due_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.equipment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment (id) ON DELETE CASCADE,
  event_type public.equipment_event_type NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_history_equipment
  ON public.equipment_history (equipment_id, created_at DESC);

CREATE TRIGGER equipment_set_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER equipment_maintenance_set_updated_at
  BEFORE UPDATE ON public.equipment_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipment_select_member"
  ON public.equipment FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "equipment_write_supervisor"
  ON public.equipment FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "equipment_assignments_select_member"
  ON public.equipment_assignments FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "equipment_assignments_write_supervisor"
  ON public.equipment_assignments FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "equipment_maintenance_select_member"
  ON public.equipment_maintenance FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "equipment_maintenance_write_supervisor"
  ON public.equipment_maintenance FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "equipment_history_select_member"
  ON public.equipment_history FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "equipment_history_insert_supervisor"
  ON public.equipment_history FOR INSERT TO authenticated
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));
