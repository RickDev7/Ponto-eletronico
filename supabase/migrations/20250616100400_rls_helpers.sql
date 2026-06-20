-- Private schema for SECURITY DEFINER helpers (not exposed via Data API)

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- Role rank helper
CREATE OR REPLACE FUNCTION private.role_rank(p_role public.member_role)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p_role
    WHEN 'admin' THEN 3
    WHEN 'supervisor' THEN 2
    WHEN 'employee' THEN 1
  END;
$$;

-- Check active membership
CREATE OR REPLACE FUNCTION private.is_company_member(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = p_company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
  );
$$;

-- Get member role for company
CREATE OR REPLACE FUNCTION private.get_member_role(p_company_id uuid)
RETURNS public.member_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.role
  FROM public.company_members cm
  WHERE cm.company_id = p_company_id
    AND cm.user_id = auth.uid()
    AND cm.status = 'active'
  LIMIT 1;
$$;

-- Check minimum role (admin > supervisor > employee)
CREATE OR REPLACE FUNCTION private.has_min_role(
  p_company_id uuid,
  p_min_role public.member_role
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.role_rank(private.get_member_role(p_company_id))
      >= private.role_rank(p_min_role);
$$;

-- Get employee record for current user in company
CREATE OR REPLACE FUNCTION private.get_employee_id(p_company_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id
  FROM public.employees e
  INNER JOIN public.company_members cm ON cm.id = e.member_id
  WHERE e.company_id = p_company_id
    AND cm.user_id = auth.uid()
    AND cm.status = 'active'
  LIMIT 1;
$$;

-- Check if task is assigned to current user's employee record
CREATE OR REPLACE FUNCTION private.is_task_assigned(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.task_assignments ta
    INNER JOIN public.tasks t ON t.id = ta.task_id
    WHERE ta.task_id = p_task_id
      AND ta.employee_id = private.get_employee_id(t.company_id)
  );
$$;

-- Can employee see task (supervisor+ sees all, employee sees assigned)
CREATE OR REPLACE FUNCTION private.can_view_task(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = p_task_id
      AND private.is_company_member(t.company_id)
      AND (
        private.has_min_role(t.company_id, 'supervisor')
        OR private.is_task_assigned(p_task_id)
      )
  );
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated, service_role;
