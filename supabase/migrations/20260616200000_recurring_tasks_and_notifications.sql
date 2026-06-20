-- Recurring task support
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence_rule  jsonb        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS parent_task_id   uuid         REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurrence_index integer      DEFAULT NULL;

COMMENT ON COLUMN public.tasks.recurrence_rule IS
  'JSON: { type: "daily"|"weekly"|"monthly", interval: number, days?: number[], until: "YYYY-MM-DD"|null }';
COMMENT ON COLUMN public.tasks.parent_task_id IS
  'For recurring task instances: points to the root task that defined the rule';
COMMENT ON COLUMN public.tasks.recurrence_index IS
  'Sequence number of this occurrence (0 = original, 1 = first repeat, etc.)';

CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id
  ON public.tasks(parent_task_id)
  WHERE parent_task_id IS NOT NULL;

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recipient_id  uuid        NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  actor_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  type          text        NOT NULL,
  title         text        NOT NULL,
  body          text,
  entity_type   text,
  entity_id     uuid,
  read_at       timestamptz DEFAULT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_company
  ON public.notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(recipient_id)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient_id = (SELECT auth.uid()));

CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE TO authenticated
  USING (recipient_id = (SELECT auth.uid()))
  WITH CHECK (recipient_id = (SELECT auth.uid()));

CREATE POLICY notifications_delete ON public.notifications
  FOR DELETE TO authenticated
  USING (recipient_id = (SELECT auth.uid()));

-- Trigger: auto-notify supervisors/admins on check-in/out
CREATE OR REPLACE FUNCTION private.notify_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_task_title  text;
  v_emp_name    text;
BEGIN
  SELECT title INTO v_task_title FROM public.tasks WHERE id = NEW.task_id;
  SELECT full_name INTO v_emp_name FROM public.employees WHERE id = NEW.employee_id;

  INSERT INTO public.notifications(
    company_id, recipient_id, actor_id,
    type, title, body, entity_type, entity_id
  )
  SELECT
    NEW.company_id,
    cm.user_id,
    NULL,
    CASE WHEN NEW.check_out_at IS NULL THEN 'check_in' ELSE 'check_out' END,
    CASE WHEN NEW.check_out_at IS NULL
      THEN v_emp_name || ' hat eingecheckt'
      ELSE v_emp_name || ' hat ausgecheckt'
    END,
    v_task_title,
    'task',
    NEW.task_id
  FROM public.company_members cm
  WHERE cm.company_id = NEW.company_id
    AND cm.role IN ('admin', 'supervisor')
    AND cm.status = 'active';

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_checkin
  AFTER INSERT OR UPDATE OF check_out_at ON public.check_ins
  FOR EACH ROW
  EXECUTE FUNCTION private.notify_checkin();

REVOKE EXECUTE ON FUNCTION private.notify_checkin() FROM anon, authenticated;
