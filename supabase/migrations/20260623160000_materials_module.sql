-- Materials management: stock, purchases, usage, consumption, service links

DO $$ BEGIN
  CREATE TYPE public.material_unit AS ENUM ('piece', 'liter', 'kg', 'meter', 'box', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  description text,
  unit public.material_unit NOT NULL DEFAULT 'piece',
  quantity_on_hand numeric(12, 3) NOT NULL DEFAULT 0,
  min_stock_level numeric(12, 3) NOT NULL DEFAULT 0,
  unit_cost_cents integer,
  service_id uuid REFERENCES public.services (id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_materials_sku
  ON public.materials (company_id, sku)
  WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_materials_company ON public.materials (company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_materials_service ON public.materials (service_id) WHERE service_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.material_service_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials (id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services (id) ON DELETE CASCADE,
  quantity_per_service numeric(12, 3) NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (material_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_material_service_links_service
  ON public.material_service_links (service_id);

CREATE TABLE IF NOT EXISTS public.material_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials (id) ON DELETE CASCADE,
  quantity numeric(12, 3) NOT NULL CHECK (quantity > 0),
  unit_cost_cents integer,
  total_cost_cents integer,
  vendor text,
  invoice_ref text,
  purchased_at date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_purchases_material
  ON public.material_purchases (material_id, purchased_at DESC);

CREATE TABLE IF NOT EXISTS public.material_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials (id) ON DELETE CASCADE,
  quantity numeric(12, 3) NOT NULL CHECK (quantity > 0),
  employee_id uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks (id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services (id) ON DELETE SET NULL,
  used_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_usage_material
  ON public.material_usage (material_id, used_at DESC);

CREATE TABLE IF NOT EXISTS public.material_consumption (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials (id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services (id) ON DELETE CASCADE,
  quantity numeric(12, 3) NOT NULL CHECK (quantity > 0),
  task_id uuid REFERENCES public.tasks (id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  consumed_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_consumption_material
  ON public.material_consumption (material_id, consumed_at DESC);
CREATE INDEX IF NOT EXISTS idx_material_consumption_service
  ON public.material_consumption (service_id, consumed_at DESC);

CREATE TRIGGER materials_set_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_service_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_consumption ENABLE ROW LEVEL SECURITY;

CREATE POLICY "materials_select_member"
  ON public.materials FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "materials_write_supervisor"
  ON public.materials FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "material_service_links_select_member"
  ON public.material_service_links FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "material_service_links_write_supervisor"
  ON public.material_service_links FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "material_purchases_select_member"
  ON public.material_purchases FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "material_purchases_write_supervisor"
  ON public.material_purchases FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "material_usage_select_member"
  ON public.material_usage FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "material_usage_write_supervisor"
  ON public.material_usage FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "material_consumption_select_member"
  ON public.material_consumption FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "material_consumption_write_supervisor"
  ON public.material_consumption FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));
