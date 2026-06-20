-- Quotes module enhancements: extended status, fields, line discounts, activity timeline

ALTER TYPE public.quote_status ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE public.quote_status ADD VALUE IF NOT EXISTS 'expired';

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS issue_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS discount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_address text,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.contracts (id) ON DELETE SET NULL;

ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS discount_percent numeric(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate numeric(5, 2);

CREATE TABLE IF NOT EXISTS public.quote_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.quotes (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_events_quote ON public.quote_events (quote_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_company_issue ON public.quotes (company_id, issue_date DESC);

ALTER TABLE public.quote_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_events_select_member"
  ON public.quote_events FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "quote_events_write_supervisor"
  ON public.quote_events FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));
