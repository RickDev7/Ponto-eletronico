-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Task Templates
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.task_templates (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id               uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name                     text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  service_type             text NOT NULL,
  description              text,
  default_duration_minutes integer,
  checklist_items          jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active                boolean NOT NULL DEFAULT true,
  created_by               uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_templates_company
  ON public.task_templates(company_id);

CREATE TRIGGER task_templates_updated_at
  BEFORE UPDATE ON public.task_templates
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY templates_select ON public.task_templates
  FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY templates_insert ON public.task_templates
  FOR INSERT TO authenticated
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY templates_update ON public.task_templates
  FOR UPDATE TO authenticated
  USING  (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY templates_delete ON public.task_templates
  FOR DELETE TO authenticated
  USING (private.has_min_role(company_id, 'admin'));
