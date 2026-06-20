-- Enable RLS on all public tables

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ─── companies ───────────────────────────────────────────────────────────

CREATE POLICY "companies_select_member"
  ON public.companies FOR SELECT
  TO authenticated
  USING (private.is_company_member(id));

CREATE POLICY "companies_update_admin"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (private.has_min_role(id, 'admin'))
  WITH CHECK (private.has_min_role(id, 'admin'));

-- Insert via service role / onboarding RPC only (no direct insert policy)

-- ─── profiles ──────────────────────────────────────────────────────────────

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_select_coworkers"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.company_members cm1
      INNER JOIN public.company_members cm2
        ON cm1.company_id = cm2.company_id
      WHERE cm1.user_id = auth.uid()
        AND cm2.user_id = profiles.id
        AND cm1.status = 'active'
        AND cm2.status = 'active'
    )
  );

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Insert handled by trigger on auth.users signup

-- ─── company_members ───────────────────────────────────────────────────────

CREATE POLICY "members_select_same_company"
  ON public.company_members FOR SELECT
  TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "members_insert_admin"
  ON public.company_members FOR INSERT
  TO authenticated
  WITH CHECK (private.has_min_role(company_id, 'admin'));

CREATE POLICY "members_update_admin"
  ON public.company_members FOR UPDATE
  TO authenticated
  USING (private.has_min_role(company_id, 'admin'))
  WITH CHECK (private.has_min_role(company_id, 'admin'));

CREATE POLICY "members_delete_admin"
  ON public.company_members FOR DELETE
  TO authenticated
  USING (private.has_min_role(company_id, 'admin'));

-- ─── employees ─────────────────────────────────────────────────────────────

CREATE POLICY "employees_select_member"
  ON public.employees FOR SELECT
  TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "employees_insert_supervisor"
  ON public.employees FOR INSERT
  TO authenticated
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "employees_update_supervisor"
  ON public.employees FOR UPDATE
  TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "employees_delete_admin"
  ON public.employees FOR DELETE
  TO authenticated
  USING (private.has_min_role(company_id, 'admin'));

-- ─── company_invites ───────────────────────────────────────────────────────

CREATE POLICY "invites_select_admin"
  ON public.company_invites FOR SELECT
  TO authenticated
  USING (private.has_min_role(company_id, 'admin'));

CREATE POLICY "invites_insert_admin"
  ON public.company_invites FOR INSERT
  TO authenticated
  WITH CHECK (private.has_min_role(company_id, 'admin'));

CREATE POLICY "invites_update_admin"
  ON public.company_invites FOR UPDATE
  TO authenticated
  USING (private.has_min_role(company_id, 'admin'))
  WITH CHECK (private.has_min_role(company_id, 'admin'));

CREATE POLICY "invites_delete_admin"
  ON public.company_invites FOR DELETE
  TO authenticated
  USING (private.has_min_role(company_id, 'admin'));

-- ─── clients ───────────────────────────────────────────────────────────────

CREATE POLICY "clients_select_member"
  ON public.clients FOR SELECT
  TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "clients_insert_supervisor"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "clients_update_supervisor"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "clients_delete_admin"
  ON public.clients FOR DELETE
  TO authenticated
  USING (private.has_min_role(company_id, 'admin'));

-- ─── addresses ─────────────────────────────────────────────────────────────

CREATE POLICY "addresses_select_member"
  ON public.addresses FOR SELECT
  TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "addresses_insert_supervisor"
  ON public.addresses FOR INSERT
  TO authenticated
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "addresses_update_supervisor"
  ON public.addresses FOR UPDATE
  TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "addresses_delete_admin"
  ON public.addresses FOR DELETE
  TO authenticated
  USING (private.has_min_role(company_id, 'admin'));

-- ─── tasks ─────────────────────────────────────────────────────────────────

CREATE POLICY "tasks_select"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    private.is_company_member(company_id)
    AND (
      private.has_min_role(company_id, 'supervisor')
      OR private.is_task_assigned(id)
    )
  );

CREATE POLICY "tasks_insert_supervisor"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "tasks_update"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    private.has_min_role(company_id, 'supervisor')
    OR (
      private.is_task_assigned(id)
      AND status IN ('scheduled', 'in_progress')
    )
  )
  WITH CHECK (
    private.has_min_role(company_id, 'supervisor')
    OR (
      private.is_task_assigned(id)
      AND status IN ('in_progress', 'completed')
    )
  );

CREATE POLICY "tasks_delete_admin"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (private.has_min_role(company_id, 'admin'));

-- ─── task_assignments ──────────────────────────────────────────────────────

CREATE POLICY "assignments_select"
  ON public.task_assignments FOR SELECT
  TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "assignments_insert_supervisor"
  ON public.task_assignments FOR INSERT
  TO authenticated
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "assignments_update_supervisor"
  ON public.task_assignments FOR UPDATE
  TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "assignments_delete_supervisor"
  ON public.task_assignments FOR DELETE
  TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'));

-- ─── check_ins ─────────────────────────────────────────────────────────────

CREATE POLICY "check_ins_select"
  ON public.check_ins FOR SELECT
  TO authenticated
  USING (
    private.is_company_member(company_id)
    AND (
      private.has_min_role(company_id, 'supervisor')
      OR employee_id = private.get_employee_id(company_id)
    )
  );

CREATE POLICY "check_ins_insert_employee"
  ON public.check_ins FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = private.get_employee_id(company_id)
    AND private.is_task_assigned(task_id)
  );

CREATE POLICY "check_ins_update_employee"
  ON public.check_ins FOR UPDATE
  TO authenticated
  USING (
    employee_id = private.get_employee_id(company_id)
    OR private.has_min_role(company_id, 'supervisor')
  )
  WITH CHECK (
    employee_id = private.get_employee_id(company_id)
    OR private.has_min_role(company_id, 'supervisor')
  );

CREATE POLICY "check_ins_delete_admin"
  ON public.check_ins FOR DELETE
  TO authenticated
  USING (private.has_min_role(company_id, 'admin'));

-- ─── task_photos ─────────────────────────────────────────────────────────────

CREATE POLICY "photos_select"
  ON public.task_photos FOR SELECT
  TO authenticated
  USING (private.can_view_task(task_id));

CREATE POLICY "photos_insert_employee"
  ON public.task_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    private.is_task_assigned(task_id)
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "photos_delete_admin"
  ON public.task_photos FOR DELETE
  TO authenticated
  USING (private.has_min_role(company_id, 'admin'));

-- ─── activity_logs (append-only for members) ─────────────────────────────────

CREATE POLICY "activity_select_member"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "activity_insert_member"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    private.is_company_member(company_id)
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- No update/delete policies — immutable audit trail

-- ─── reports ─────────────────────────────────────────────────────────────────

CREATE POLICY "reports_select_supervisor"
  ON public.reports FOR SELECT
  TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "reports_insert_supervisor"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (
    private.has_min_role(company_id, 'supervisor')
    AND generated_by = auth.uid()
  );

CREATE POLICY "reports_delete_admin"
  ON public.reports FOR DELETE
  TO authenticated
  USING (private.has_min_role(company_id, 'admin'));
