-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Task Tags + Address Coordinates
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Address coordinates ───────────────────────────────────────────────────────
ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- ── Task tags ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name        text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  color       text NOT NULL DEFAULT '#6366f1',
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_task_tags_company ON public.task_tags(company_id);

ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tag_select ON public.task_tags
  FOR SELECT TO authenticated USING (private.is_company_member(company_id));

CREATE POLICY tag_insert ON public.task_tags
  FOR INSERT TO authenticated
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY tag_delete ON public.task_tags
  FOR DELETE TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'));

-- ── Task-tag join ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_tag_assignments (
  task_id    uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tag_id     uuid NOT NULL REFERENCES public.task_tags(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_tag_assign_task ON public.task_tag_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_tag_assign_tag  ON public.task_tag_assignments(tag_id);

ALTER TABLE public.task_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tag_assign_select ON public.task_tag_assignments
  FOR SELECT TO authenticated USING (private.is_company_member(company_id));

CREATE POLICY tag_assign_insert ON public.task_tag_assignments
  FOR INSERT TO authenticated
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY tag_assign_delete ON public.task_tag_assignments
  FOR DELETE TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'));
