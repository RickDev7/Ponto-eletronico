-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Task Checklist Items
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Table ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_checklist_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  text         text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  is_checked   boolean NOT NULL DEFAULT false,
  checked_at   timestamptz,
  checked_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  sort_order   integer NOT NULL DEFAULT 0,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_checklist_task_id
  ON public.task_checklist_items(task_id);

CREATE INDEX IF NOT EXISTS idx_checklist_company_id
  ON public.task_checklist_items(company_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;

-- Members of the company can read checklist items
CREATE POLICY checklist_select ON public.task_checklist_items
  FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

-- Supervisors+ can insert
CREATE POLICY checklist_insert ON public.task_checklist_items
  FOR INSERT TO authenticated
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

-- Supervisors+ can update (toggle, reorder, rename)
CREATE POLICY checklist_update ON public.task_checklist_items
  FOR UPDATE TO authenticated
  USING  (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

-- Employees can toggle their own items (check/uncheck)
CREATE POLICY checklist_toggle_employee ON public.task_checklist_items
  FOR UPDATE TO authenticated
  USING  (private.is_company_member(company_id))
  WITH CHECK (private.is_company_member(company_id));

-- Supervisors+ can delete
CREATE POLICY checklist_delete ON public.task_checklist_items
  FOR DELETE TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'));
