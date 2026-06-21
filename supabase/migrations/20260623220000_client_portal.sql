-- Client portal: client role, member client_id, documents, scoped RLS
-- Note: ADD VALUE + enum literals in the same transaction fails (PG 55P04).
-- We compare via ::text so this migration is safe in a single transaction.

ALTER TYPE public.member_role ADD VALUE IF NOT EXISTS 'client';

ALTER TABLE public.company_members
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_company_members_client
  ON public.company_members (client_id)
  WHERE client_id IS NOT NULL;

ALTER TABLE public.company_members
  DROP CONSTRAINT IF EXISTS company_members_client_role_requires_client_id;

ALTER TABLE public.company_members
  ADD CONSTRAINT company_members_client_role_requires_client_id
  CHECK (role::text <> 'client' OR client_id IS NOT NULL);

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visible_to_client boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_reports_client_visible
  ON public.reports (company_id, client_id, visible_to_client)
  WHERE client_id IS NOT NULL;

-- ─── client documents ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  storage_path text NOT NULL,
  file_name text,
  file_size integer,
  mime_type text,
  visible_to_client boolean NOT NULL DEFAULT true,
  uploaded_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_documents_client
  ON public.client_documents (company_id, client_id, uploaded_at DESC);

CREATE TRIGGER client_documents_set_updated_at
  BEFORE UPDATE ON public.client_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- ─── RLS helpers ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.role_rank(p_role public.member_role)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_role::text IN ('admin', 'owner') THEN 3
    WHEN p_role::text = 'supervisor' THEN 2
    WHEN p_role::text = 'employee' THEN 1
    WHEN p_role::text = 'client' THEN 0
  END;
$$;

CREATE OR REPLACE FUNCTION private.get_member_client_id(p_company_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.client_id
  FROM public.company_members cm
  WHERE cm.company_id = p_company_id
    AND cm.user_id = auth.uid()
    AND cm.status = 'active'
    AND cm.role::text = 'client'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.can_view_client_data(
  p_company_id uuid,
  p_client_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN private.get_member_role(p_company_id)::text = 'client' THEN
      p_client_id IS NOT NULL
      AND p_client_id = private.get_member_client_id(p_company_id)
    ELSE
      private.is_company_member(p_company_id)
  END;
$$;

CREATE OR REPLACE FUNCTION private.can_view_client_report(p_report_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.reports r
    WHERE r.id = p_report_id
      AND private.is_company_member(r.company_id)
      AND (
        private.get_member_role(r.company_id)::text <> 'client'
        OR (
          r.visible_to_client = true
          AND r.client_id IS NOT NULL
          AND r.client_id = private.get_member_client_id(r.company_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_view_client_task(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    INNER JOIN public.addresses a ON a.id = t.address_id
    WHERE t.id = p_task_id
      AND private.can_view_client_data(t.company_id, a.client_id)
  );
$$;

CREATE OR REPLACE FUNCTION private.storage_client_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT (split_part(object_name, '/', 2))::uuid;
$$;

-- ─── storage bucket ──────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,
  20971520,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "client_documents_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "client_documents_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "client_documents_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "client_documents_storage_delete" ON storage.objects;

CREATE POLICY "client_documents_storage_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND private.is_company_member(private.storage_company_id(name))
    AND (
      private.has_min_role(private.storage_company_id(name), 'supervisor')
      OR private.storage_client_id(name) = private.get_member_client_id(private.storage_company_id(name))
    )
  );

CREATE POLICY "client_documents_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-documents'
    AND private.has_min_role(private.storage_company_id(name), 'supervisor')
  );

CREATE POLICY "client_documents_storage_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND private.has_min_role(private.storage_company_id(name), 'supervisor')
  )
  WITH CHECK (
    bucket_id = 'client-documents'
    AND private.has_min_role(private.storage_company_id(name), 'supervisor')
  );

CREATE POLICY "client_documents_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND private.has_min_role(private.storage_company_id(name), 'supervisor')
  );

-- ─── clients ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "clients_select_member" ON public.clients;
CREATE POLICY "clients_select_member"
  ON public.clients FOR SELECT TO authenticated
  USING (private.can_view_client_data(company_id, id));

-- ─── addresses ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "addresses_select_member" ON public.addresses;
CREATE POLICY "addresses_select_member"
  ON public.addresses FOR SELECT TO authenticated
  USING (private.can_view_client_data(company_id, client_id));

-- ─── contracts & items ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "contracts_select_member" ON public.contracts;
CREATE POLICY "contracts_select_member"
  ON public.contracts FOR SELECT TO authenticated
  USING (private.can_view_client_data(company_id, client_id));

DROP POLICY IF EXISTS "contract_items_select_member" ON public.contract_items;
CREATE POLICY "contract_items_select_member"
  ON public.contract_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.contracts c
      WHERE c.id = contract_items.contract_id
        AND private.can_view_client_data(c.company_id, c.client_id)
    )
  );

-- ─── invoices & items & payments ─────────────────────────────────────────────

DROP POLICY IF EXISTS "invoices_select_member" ON public.invoices;
CREATE POLICY "invoices_select_member"
  ON public.invoices FOR SELECT TO authenticated
  USING (
    private.can_view_client_data(company_id, client_id)
    AND (
      private.get_member_role(company_id)::text <> 'client'
      OR status <> 'draft'
    )
  );

DROP POLICY IF EXISTS "invoice_items_select_member" ON public.invoice_items;
CREATE POLICY "invoice_items_select_member"
  ON public.invoice_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND private.can_view_client_data(i.company_id, i.client_id)
        AND (
          private.get_member_role(i.company_id)::text <> 'client'
          OR i.status <> 'draft'
        )
    )
  );

DROP POLICY IF EXISTS "payments_select_member" ON public.payments;
CREATE POLICY "payments_select_member"
  ON public.payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = payments.invoice_id
        AND private.can_view_client_data(i.company_id, i.client_id)
        AND (
          private.get_member_role(i.company_id)::text <> 'client'
          OR i.status <> 'draft'
        )
    )
  );

-- ─── reports ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "reports_select_supervisor" ON public.reports;
CREATE POLICY "reports_select_member"
  ON public.reports FOR SELECT TO authenticated
  USING (private.can_view_client_report(id));

-- ─── tasks (client sees own properties only) ─────────────────────────────────

DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
CREATE POLICY "tasks_select"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    private.has_min_role(company_id, 'supervisor')
    OR private.is_task_assigned(id)
    OR (
      private.get_member_role(company_id)::text = 'client'
      AND private.can_view_client_task(id)
    )
  );

-- ─── service reports ─────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.service_report_status AS ENUM (
    'draft', 'pending_signature', 'signed', 'generated'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.service_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  check_in_id uuid REFERENCES public.check_ins (id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  status public.service_report_status NOT NULL DEFAULT 'draft',
  client_name text,
  client_signature_path text,
  storage_path text,
  metadata jsonb NOT NULL DEFAULT '{}',
  signed_at timestamptz,
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_reports_task_unique UNIQUE (task_id, check_in_id)
);

CREATE INDEX IF NOT EXISTS idx_service_reports_company
  ON public.service_reports (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_reports_task
  ON public.service_reports (task_id);

DROP TRIGGER IF EXISTS service_reports_set_updated_at ON public.service_reports;
CREATE TRIGGER service_reports_set_updated_at
  BEFORE UPDATE ON public.service_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.service_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_reports_insert_member" ON public.service_reports;
CREATE POLICY "service_reports_insert_member"
  ON public.service_reports FOR INSERT TO authenticated
  WITH CHECK (private.is_company_member(company_id));

DROP POLICY IF EXISTS "service_reports_update_member" ON public.service_reports;
CREATE POLICY "service_reports_update_member"
  ON public.service_reports FOR UPDATE TO authenticated
  USING (private.is_company_member(company_id))
  WITH CHECK (private.is_company_member(company_id));

DROP POLICY IF EXISTS "service_reports_select_member" ON public.service_reports;
CREATE POLICY "service_reports_select_member"
  ON public.service_reports FOR SELECT TO authenticated
  USING (
    private.is_company_member(company_id)
    AND (
      private.get_member_role(company_id)::text <> 'client'
      OR (
        status IN ('signed', 'generated')
        AND private.can_view_client_task(task_id)
      )
    )
  );

-- ─── client documents table ──────────────────────────────────────────────────

CREATE POLICY "client_documents_select"
  ON public.client_documents FOR SELECT TO authenticated
  USING (
    private.can_view_client_data(company_id, client_id)
    AND (
      private.get_member_role(company_id)::text <> 'client'
      OR visible_to_client = true
    )
  );

CREATE POLICY "client_documents_write_supervisor"
  ON public.client_documents FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));
