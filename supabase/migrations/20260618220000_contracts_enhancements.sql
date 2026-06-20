-- Contracts module enhancements

ALTER TYPE public.contract_frequency ADD VALUE IF NOT EXISTS 'bimonthly';

DO $$ BEGIN
  CREATE TYPE public.contract_status AS ENUM (
    'active', 'pending', 'suspended', 'expired', 'cancelled', 'renewing'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS contract_number text,
  ADD COLUMN IF NOT EXISTS status public.contract_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS discount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal_cents integer,
  ADD COLUMN IF NOT EXISTS tax_cents integer,
  ADD COLUMN IF NOT EXISTS total_cents integer,
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS renewal_notice_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS auto_generate_invoice boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_send_email boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_generate_pdf boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_reminder boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS client_company text,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS client_address text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_number_unique
  ON public.contracts (company_id, contract_number)
  WHERE contract_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.contract_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts (id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(12, 2) NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL DEFAULT 0,
  line_total_cents integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_items_contract ON public.contract_items (contract_id, sort_order);

CREATE TABLE IF NOT EXISTS public.contract_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_events_contract ON public.contract_events (contract_id, created_at DESC);

ALTER TABLE public.contract_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_items_select_member"
  ON public.contract_items FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "contract_items_write_supervisor"
  ON public.contract_items FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "contract_events_select_member"
  ON public.contract_events FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "contract_events_write_supervisor"
  ON public.contract_events FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

ALTER TABLE public.finance_document_counters
  DROP CONSTRAINT IF EXISTS finance_document_counters_doc_type_check;

ALTER TABLE public.finance_document_counters
  ADD CONSTRAINT finance_document_counters_doc_type_check
  CHECK (doc_type IN ('quote', 'invoice', 'contract'));
