-- Platform Management: tenants, subscriptions console, support, logs, feature flags, audit
-- Enterprise role hierarchy: owner > manager > supervisor > employee > client

-- ─── Tenant lifecycle ────────────────────────────────────────────────────────

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trial', 'suspended'));

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text;

CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies (status);

-- ─── Extended tenant roles ───────────────────────────────────────────────────
-- admin→owner migration + role_rank update: 20260624000300_platform_roles_apply.sql
-- Enum values owner/manager: run 20260624000000 and 20260624000100 first (or db push).

CREATE OR REPLACE FUNCTION private.role_rank_text(p_role text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p_role
    WHEN 'owner' THEN 4
    WHEN 'admin' THEN 4
    WHEN 'manager' THEN 3
    WHEN 'supervisor' THEN 2
    WHEN 'employee' THEN 1
    WHEN 'client' THEN 0
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION private.has_min_role_text(
  p_company_id uuid,
  p_min_role text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.role_rank_text(private.get_member_role(p_company_id)::text)
      >= private.role_rank_text(p_min_role);
$$;

-- ─── Platform super admins (separate from tenant roles) ──────────────────────

CREATE TABLE IF NOT EXISTS public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_admins_user ON public.platform_admins (user_id);

CREATE OR REPLACE FUNCTION private.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins pa
    WHERE pa.user_id = auth.uid()
  );
$$;

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_admins_select_self ON public.platform_admins;
CREATE POLICY platform_admins_select_self
  ON public.platform_admins FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_platform_admin());

-- ─── Feature flags (global, per-plan, or per-tenant) ─────────────────────────

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  company_id uuid REFERENCES public.companies (id) ON DELETE CASCADE,
  plan_key text,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (key, company_id)
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON public.feature_flags (key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_company ON public.feature_flags (company_id);

-- ─── Platform audit trail ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  company_id uuid REFERENCES public.companies (id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_created
  ON public.platform_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_actor
  ON public.platform_audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_company
  ON public.platform_audit_logs (company_id, created_at DESC);

-- ─── Platform system logs ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.platform_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL DEFAULT 'info'
    CHECK (level IN ('debug', 'info', 'warn', 'error')),
  source text NOT NULL,
  message text NOT NULL,
  company_id uuid REFERENCES public.companies (id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_logs_created
  ON public.platform_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_logs_level
  ON public.platform_logs (level, created_at DESC);

-- ─── Support tickets ─────────────────────────────────────────────────────────

CREATE TYPE public.support_ticket_status AS ENUM (
  'open', 'in_progress', 'waiting', 'resolved', 'closed'
);

CREATE TYPE public.support_ticket_priority AS ENUM (
  'low', 'normal', 'high', 'urgent'
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  subject text NOT NULL,
  status public.support_ticket_status NOT NULL DEFAULT 'open',
  priority public.support_ticket_priority NOT NULL DEFAULT 'normal',
  assigned_to uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets (id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_company
  ON public.support_tickets (company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket
  ON public.support_messages (ticket_id, created_at);

-- ─── RLS: platform tables ────────────────────────────────────────────────────

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Feature flags: platform admins full access; tenants read applicable flags
DROP POLICY IF EXISTS feature_flags_platform_all ON public.feature_flags;
CREATE POLICY feature_flags_platform_all
  ON public.feature_flags FOR ALL TO authenticated
  USING (private.is_platform_admin())
  WITH CHECK (private.is_platform_admin());

DROP POLICY IF EXISTS feature_flags_tenant_read ON public.feature_flags;
CREATE POLICY feature_flags_tenant_read
  ON public.feature_flags FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR company_id IN (
      SELECT cm.company_id FROM public.company_members cm
      WHERE cm.user_id = auth.uid() AND cm.status = 'active'
    )
  );

-- Platform audit & logs: platform admins only
DROP POLICY IF EXISTS platform_audit_select ON public.platform_audit_logs;
CREATE POLICY platform_audit_select
  ON public.platform_audit_logs FOR SELECT TO authenticated
  USING (private.is_platform_admin());

DROP POLICY IF EXISTS platform_audit_insert ON public.platform_audit_logs;
CREATE POLICY platform_audit_insert
  ON public.platform_audit_logs FOR INSERT TO authenticated
  WITH CHECK (private.is_platform_admin() OR actor_id = auth.uid());

DROP POLICY IF EXISTS platform_logs_select ON public.platform_logs;
CREATE POLICY platform_logs_select
  ON public.platform_logs FOR SELECT TO authenticated
  USING (private.is_platform_admin());

DROP POLICY IF EXISTS platform_logs_insert ON public.platform_logs;
CREATE POLICY platform_logs_insert
  ON public.platform_logs FOR INSERT TO authenticated
  WITH CHECK (private.is_platform_admin());

-- Support: tenant members (manager+) see own tickets; platform admins see all
DROP POLICY IF EXISTS support_tickets_tenant_select ON public.support_tickets;
CREATE POLICY support_tickets_tenant_select
  ON public.support_tickets FOR SELECT TO authenticated
  USING (
    private.is_platform_admin()
    OR (
      private.has_min_role_text(company_id, 'manager')
      AND company_id IN (
        SELECT cm.company_id FROM public.company_members cm
        WHERE cm.user_id = auth.uid() AND cm.status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS support_tickets_tenant_insert ON public.support_tickets;
CREATE POLICY support_tickets_tenant_insert
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (
    private.has_min_role_text(company_id, 'manager')
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS support_tickets_platform_update ON public.support_tickets;
CREATE POLICY support_tickets_platform_update
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (private.is_platform_admin() OR private.has_min_role_text(company_id, 'manager'))
  WITH CHECK (private.is_platform_admin() OR private.has_min_role_text(company_id, 'manager'));

DROP POLICY IF EXISTS support_messages_select ON public.support_messages;
CREATE POLICY support_messages_select
  ON public.support_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          private.is_platform_admin()
          OR private.has_min_role_text(t.company_id, 'manager')
        )
    )
    AND (NOT is_internal OR private.is_platform_admin())
  );

DROP POLICY IF EXISTS support_messages_insert ON public.support_messages;
CREATE POLICY support_messages_insert
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          private.is_platform_admin()
          OR private.has_min_role_text(t.company_id, 'manager')
        )
    )
  );

-- Update subscription owner policy (admin migrated to owner)
DROP POLICY IF EXISTS subscriptions_select_admin ON public.subscriptions;
CREATE POLICY subscriptions_select_owner ON public.subscriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = subscriptions.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
        AND cm.role::text IN ('owner', 'admin')
    )
  );

-- Platform admins can read all subscriptions
DROP POLICY IF EXISTS subscriptions_platform_select ON public.subscriptions;
CREATE POLICY subscriptions_platform_select
  ON public.subscriptions FOR SELECT TO authenticated
  USING (private.is_platform_admin());

DROP POLICY IF EXISTS subscriptions_platform_update ON public.subscriptions;
CREATE POLICY subscriptions_platform_update
  ON public.subscriptions FOR UPDATE TO authenticated
  USING (private.is_platform_admin())
  WITH CHECK (private.is_platform_admin());

DROP POLICY IF EXISTS billing_events_platform_select ON public.billing_events;
CREATE POLICY billing_events_platform_select
  ON public.billing_events FOR SELECT TO authenticated
  USING (private.is_platform_admin());

-- Platform admins read all companies
DROP POLICY IF EXISTS companies_platform_select ON public.companies;
CREATE POLICY companies_platform_select
  ON public.companies FOR SELECT TO authenticated
  USING (private.is_platform_admin());

DROP POLICY IF EXISTS companies_platform_update ON public.companies;
CREATE POLICY companies_platform_update
  ON public.companies FOR UPDATE TO authenticated
  USING (private.is_platform_admin())
  WITH CHECK (private.is_platform_admin());

-- Triggers
DROP TRIGGER IF EXISTS feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default global feature flags
INSERT INTO public.feature_flags (key, enabled, description)
SELECT v.key, v.enabled, v.description
FROM (VALUES
  ('ai_assistant', true, 'AI Operations Assistant'),
  ('automations', true, 'Automation engine'),
  ('client_portal', true, 'Client portal access'),
  ('advanced_analytics', false, 'Advanced analytics dashboards'),
  ('api_access', false, 'Public API access')
) AS v(key, enabled, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.feature_flags f
  WHERE f.key = v.key AND f.company_id IS NULL AND f.plan_key IS NULL
);

COMMENT ON TABLE public.platform_admins IS 'Super Admin users with cross-tenant platform access';
COMMENT ON TABLE public.feature_flags IS 'Feature toggles: global (company_id NULL), per-plan, or per-tenant';
COMMENT ON TABLE public.platform_audit_logs IS 'Immutable audit trail for platform admin actions';
COMMENT ON TABLE public.platform_logs IS 'Centralized platform/system event logs';
COMMENT ON TABLE public.support_tickets IS 'Customer support tickets per tenant';
