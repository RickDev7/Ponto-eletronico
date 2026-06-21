-- Fix task_events policy: employees link to users via company_members, not user_id on employees

DROP POLICY IF EXISTS "task_events_insert_assigned_employee" ON public.task_events;

CREATE POLICY "task_events_insert_assigned_employee"
  ON public.task_events FOR INSERT TO authenticated
  WITH CHECK (
    private.is_company_member(company_id)
    AND private.is_task_assigned(task_id)
  );
