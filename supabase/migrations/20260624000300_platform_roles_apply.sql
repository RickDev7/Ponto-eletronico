-- Apply owner/manager roles after enum values are committed (PG 55P04).
-- Requires: 20260624000000_member_role_owner.sql
--           20260624000100_member_role_manager.sql

UPDATE public.company_members SET role = 'owner' WHERE role::text = 'admin';

CREATE OR REPLACE FUNCTION private.role_rank(p_role public.member_role)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_role::text IN ('owner', 'admin') THEN 4
    WHEN p_role::text = 'manager' THEN 3
    WHEN p_role::text = 'supervisor' THEN 2
    WHEN p_role::text = 'employee' THEN 1
    WHEN p_role::text = 'client' THEN 0
    ELSE 0
  END;
$$;

-- Keep has_min_role compatible with new hierarchy (text-safe internally)
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
  SELECT private.role_rank_text(private.get_member_role(p_company_id)::text)
      >= private.role_rank_text(p_min_role::text);
$$;
