-- Vehicle management: fleet, drivers, maintenance, usage (workforce planning integration)

DO $$ BEGIN
  CREATE TYPE public.vehicle_status AS ENUM ('available', 'assigned', 'maintenance', 'retired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.vehicle_fuel_type AS ENUM ('gasoline', 'diesel', 'electric', 'hybrid', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.vehicle_usage_purpose AS ENUM ('shift', 'delivery', 'commute', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name text NOT NULL,
  plate_number text,
  vin text,
  make text,
  model text,
  year integer,
  color text,
  fuel_type public.vehicle_fuel_type NOT NULL DEFAULT 'gasoline',
  status public.vehicle_status NOT NULL DEFAULT 'available',
  odometer_km integer NOT NULL DEFAULT 0,
  default_driver_id uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams (id) ON DELETE SET NULL,
  insurance_until date,
  inspection_until date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_plate
  ON public.vehicles (company_id, plate_number)
  WHERE plate_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_company ON public.vehicles (company_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver ON public.vehicles (default_driver_id) WHERE default_driver_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.vehicle_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  license_number text,
  license_expires date,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  notes text,
  assigned_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_drivers_vehicle
  ON public.vehicle_drivers (vehicle_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_drivers_active
  ON public.vehicle_drivers (company_id, vehicle_id)
  WHERE ended_at IS NULL;

CREATE TABLE IF NOT EXISTS public.vehicle_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles (id) ON DELETE CASCADE,
  maintenance_type public.maintenance_type NOT NULL DEFAULT 'preventive',
  status public.maintenance_status NOT NULL DEFAULT 'scheduled',
  title text NOT NULL,
  description text,
  scheduled_date date,
  completed_at timestamptz,
  cost_cents integer,
  vendor text,
  odometer_km integer,
  next_due_date date,
  next_due_odometer_km integer,
  performed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_vehicle
  ON public.vehicle_maintenance (vehicle_id, scheduled_date DESC);

CREATE TABLE IF NOT EXISTS public.vehicle_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles (id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks (id) ON DELETE SET NULL,
  purpose public.vehicle_usage_purpose NOT NULL DEFAULT 'shift',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  odometer_start integer,
  odometer_end integer,
  distance_km integer,
  notes text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_usage_vehicle
  ON public.vehicle_usage (vehicle_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_usage_task
  ON public.vehicle_usage (task_id)
  WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_usage_active
  ON public.vehicle_usage (company_id, vehicle_id)
  WHERE ended_at IS NULL;

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS default_vehicle_id uuid REFERENCES public.vehicles (id) ON DELETE SET NULL;

CREATE TRIGGER vehicles_set_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER vehicle_maintenance_set_updated_at
  BEFORE UPDATE ON public.vehicle_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicles_select_member"
  ON public.vehicles FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "vehicles_write_supervisor"
  ON public.vehicles FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "vehicle_drivers_select_member"
  ON public.vehicle_drivers FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "vehicle_drivers_write_supervisor"
  ON public.vehicle_drivers FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "vehicle_maintenance_select_member"
  ON public.vehicle_maintenance FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "vehicle_maintenance_write_supervisor"
  ON public.vehicle_maintenance FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "vehicle_usage_select_member"
  ON public.vehicle_usage FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "vehicle_usage_write_supervisor"
  ON public.vehicle_usage FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));
