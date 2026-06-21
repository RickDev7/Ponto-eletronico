-- Employee skills catalog + assignments (workforce / planning integration)

CREATE TABLE IF NOT EXISTS public.company_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name text NOT NULL,
  service_type text,
  description text,
  color text DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_skills_name_unique UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_company_skills_company ON public.company_skills (company_id, name);

CREATE TABLE IF NOT EXISTS public.employee_skills (
  employee_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.company_skills (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  level smallint NOT NULL DEFAULT 3 CHECK (level BETWEEN 1 AND 5),
  certified_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_skills_company ON public.employee_skills (company_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_skill ON public.employee_skills (skill_id);

ALTER TABLE public.company_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_skills_select_member"
  ON public.company_skills FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "company_skills_write_supervisor"
  ON public.company_skills FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "employee_skills_select_member"
  ON public.employee_skills FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "employee_skills_write_supervisor"
  ON public.employee_skills FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));
