-- Finance module: quotes, contracts, invoices, payments

CREATE TYPE public.quote_status AS ENUM ('draft', 'sent', 'accepted', 'rejected');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled');
CREATE TYPE public.contract_frequency AS ENUM ('monthly', 'quarterly', 'semiannual', 'annual');
CREATE TYPE public.payment_method AS ENUM ('bank_transfer', 'cash', 'card', 'other');

-- ─── quotes ────────────────────────────────────────────────────────────────

CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients (id) ON DELETE SET NULL,
  quote_number text NOT NULL,
  status public.quote_status NOT NULL DEFAULT 'draft',
  client_name text NOT NULL,
  client_company text,
  client_email text,
  client_phone text,
  valid_until date,
  subtotal_cents integer NOT NULL DEFAULT 0,
  tax_rate numeric(5, 2) NOT NULL DEFAULT 19.00,
  tax_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  notes text,
  signature_text text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quotes_number_unique UNIQUE (company_id, quote_number),
  CONSTRAINT quotes_totals_nonneg CHECK (
    subtotal_cents >= 0 AND tax_cents >= 0 AND total_cents >= 0
  )
);

CREATE INDEX idx_quotes_company_status ON public.quotes (company_id, status);
CREATE INDEX idx_quotes_company_created ON public.quotes (company_id, created_at DESC);

CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.quotes (id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(12, 2) NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL DEFAULT 0,
  line_total_cents integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quote_items_qty_positive CHECK (quantity > 0),
  CONSTRAINT quote_items_price_nonneg CHECK (unit_price_cents >= 0 AND line_total_cents >= 0)
);

CREATE INDEX idx_quote_items_quote ON public.quote_items (quote_id, sort_order);

-- ─── contracts ─────────────────────────────────────────────────────────────

CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE RESTRICT,
  title text NOT NULL,
  service_description text,
  amount_cents integer NOT NULL,
  frequency public.contract_frequency NOT NULL DEFAULT 'monthly',
  start_date date NOT NULL,
  end_date date,
  next_invoice_date date,
  is_active boolean NOT NULL DEFAULT true,
  tax_rate numeric(5, 2) NOT NULL DEFAULT 19.00,
  currency text NOT NULL DEFAULT 'EUR',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contracts_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT contracts_dates_valid CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_contracts_company_active ON public.contracts (company_id, is_active);
CREATE INDEX idx_contracts_next_invoice ON public.contracts (company_id, next_invoice_date)
  WHERE is_active = true;

-- ─── invoices ──────────────────────────────────────────────────────────────

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients (id) ON DELETE SET NULL,
  contract_id uuid REFERENCES public.contracts (id) ON DELETE SET NULL,
  quote_id uuid REFERENCES public.quotes (id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  period_start date,
  period_end date,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  client_name text NOT NULL,
  client_company text,
  client_email text,
  client_phone text,
  subtotal_cents integer NOT NULL DEFAULT 0,
  tax_rate numeric(5, 2) NOT NULL DEFAULT 19.00,
  tax_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  amount_paid_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  notes text,
  bank_details text,
  auto_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoices_number_unique UNIQUE (company_id, invoice_number),
  CONSTRAINT invoices_totals_nonneg CHECK (
    subtotal_cents >= 0 AND tax_cents >= 0 AND total_cents >= 0 AND amount_paid_cents >= 0
  )
);

CREATE INDEX idx_invoices_company_status ON public.invoices (company_id, status);
CREATE INDEX idx_invoices_company_issue ON public.invoices (company_id, issue_date DESC);
CREATE INDEX idx_invoices_company_due ON public.invoices (company_id, due_date);

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices (id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(12, 2) NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL DEFAULT 0,
  line_total_cents integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoice_items_qty_positive CHECK (quantity > 0),
  CONSTRAINT invoice_items_price_nonneg CHECK (unit_price_cents >= 0 AND line_total_cents >= 0)
);

CREATE INDEX idx_invoice_items_invoice ON public.invoice_items (invoice_id, sort_order);

-- ─── payments ──────────────────────────────────────────────────────────────

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices (id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  method public.payment_method NOT NULL DEFAULT 'bank_transfer',
  reference text,
  notes text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_amount_positive CHECK (amount_cents > 0)
);

CREATE INDEX idx_payments_company_date ON public.payments (company_id, payment_date DESC);
CREATE INDEX idx_payments_invoice ON public.payments (invoice_id);

-- ─── document counters ───────────────────────────────────────────────────────

CREATE TABLE public.finance_document_counters (
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('quote', 'invoice')),
  year integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id, doc_type, year)
);

-- ─── triggers ────────────────────────────────────────────────────────────────

CREATE TRIGGER quotes_set_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER contracts_set_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER invoices_set_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_document_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes_select_member"
  ON public.quotes FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "quotes_write_supervisor"
  ON public.quotes FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "quote_items_select_member"
  ON public.quote_items FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "quote_items_write_supervisor"
  ON public.quote_items FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "contracts_select_member"
  ON public.contracts FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "contracts_write_supervisor"
  ON public.contracts FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "invoices_select_member"
  ON public.invoices FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "invoices_write_supervisor"
  ON public.invoices FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "invoice_items_select_member"
  ON public.invoice_items FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "invoice_items_write_supervisor"
  ON public.invoice_items FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "payments_select_member"
  ON public.payments FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "payments_write_supervisor"
  ON public.payments FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "finance_counters_supervisor"
  ON public.finance_document_counters FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

-- ─── recurring invoice generation ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.finance_advance_date(
  p_date date,
  p_frequency public.contract_frequency
) RETURNS date
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN CASE p_frequency
    WHEN 'monthly' THEN (p_date + interval '1 month')::date
    WHEN 'quarterly' THEN (p_date + interval '3 months')::date
    WHEN 'semiannual' THEN (p_date + interval '6 months')::date
    WHEN 'annual' THEN (p_date + interval '1 year')::date
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_recurring_invoices()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract record;
  v_count integer := 0;
  v_year integer;
  v_next_num integer;
  v_invoice_number text;
  v_period_end date;
  v_subtotal integer;
  v_tax integer;
  v_total integer;
  v_client record;
  v_invoice_id uuid;
BEGIN
  FOR v_contract IN
    SELECT c.*
    FROM public.contracts c
    WHERE c.is_active = true
      AND c.next_invoice_date IS NOT NULL
      AND c.next_invoice_date <= CURRENT_DATE
      AND (c.end_date IS NULL OR c.next_invoice_date <= c.end_date)
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.contract_id = v_contract.id
        AND i.period_start = v_contract.next_invoice_date
        AND i.auto_generated = true
    ) THEN
      UPDATE public.contracts
      SET next_invoice_date = public.finance_advance_date(v_contract.next_invoice_date, v_contract.frequency)
      WHERE id = v_contract.id;
      CONTINUE;
    END IF;

    SELECT * INTO v_client FROM public.clients WHERE id = v_contract.client_id;

    v_period_end := public.finance_advance_date(v_contract.next_invoice_date, v_contract.frequency) - 1;
    IF v_contract.end_date IS NOT NULL AND v_period_end > v_contract.end_date THEN
      v_period_end := v_contract.end_date;
    END IF;

    v_subtotal := v_contract.amount_cents;
    v_tax := round(v_subtotal * v_contract.tax_rate / 100)::integer;
    v_total := v_subtotal + v_tax;
    v_year := EXTRACT(YEAR FROM v_contract.next_invoice_date)::integer;

    INSERT INTO public.finance_document_counters (company_id, doc_type, year, last_number)
    VALUES (v_contract.company_id, 'invoice', v_year, 1)
    ON CONFLICT (company_id, doc_type, year)
    DO UPDATE SET last_number = finance_document_counters.last_number + 1
    RETURNING last_number INTO v_next_num;

    v_invoice_number := 'INV-' || v_year::text || '-' || lpad(v_next_num::text, 4, '0');

    INSERT INTO public.invoices (
      company_id, client_id, contract_id, invoice_number, status,
      period_start, period_end, issue_date, due_date,
      client_name, client_company, client_email, client_phone,
      subtotal_cents, tax_rate, tax_cents, total_cents, auto_generated
    ) VALUES (
      v_contract.company_id, v_contract.client_id, v_contract.id, v_invoice_number, 'draft',
      v_contract.next_invoice_date, v_period_end, CURRENT_DATE,
      (CURRENT_DATE + interval '14 days')::date,
      COALESCE(v_client.name, 'Client'),
      v_client.contact_name,
      v_client.email,
      v_client.phone,
      v_subtotal, v_contract.tax_rate, v_tax, v_total, true
    )
    RETURNING id INTO v_invoice_id;

    INSERT INTO public.invoice_items (
      company_id, invoice_id, description, quantity, unit_price_cents, line_total_cents, sort_order
    ) VALUES (
      v_contract.company_id, v_invoice_id,
      COALESCE(v_contract.service_description, v_contract.title),
      1, v_contract.amount_cents, v_contract.amount_cents, 0
    );

    UPDATE public.contracts
    SET next_invoice_date = public.finance_advance_date(v_contract.next_invoice_date, v_contract.frequency)
    WHERE id = v_contract.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON TABLE public.quotes IS 'Customer quotes / orçamentos';
COMMENT ON TABLE public.contracts IS 'Recurring service contracts for automatic invoicing';
COMMENT ON TABLE public.invoices IS 'Customer invoices';
COMMENT ON TABLE public.payments IS 'Invoice payment records';
