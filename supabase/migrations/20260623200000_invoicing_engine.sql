-- Invoicing engine: audit trail, invoice kind, company-scoped recurring generation

CREATE TYPE public.invoice_kind AS ENUM ('one_time', 'recurring');

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS kind public.invoice_kind NOT NULL DEFAULT 'one_time';

UPDATE public.invoices
SET kind = 'recurring'
WHERE auto_generated = true AND kind = 'one_time';

CREATE TABLE IF NOT EXISTS public.invoice_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_events_invoice
  ON public.invoice_events (invoice_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_contract_period
  ON public.invoices (contract_id, period_start)
  WHERE contract_id IS NOT NULL;

ALTER TABLE public.invoice_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_events_select_member"
  ON public.invoice_events FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "invoice_events_write_supervisor"
  ON public.invoice_events FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

-- Support bimonthly in date advancement (used by recurring generation)
CREATE OR REPLACE FUNCTION public.finance_advance_date(
  p_date date,
  p_frequency public.contract_frequency
) RETURNS date
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN CASE p_frequency
    WHEN 'monthly' THEN (p_date + interval '1 month')::date
    WHEN 'bimonthly' THEN (p_date + interval '2 months')::date
    WHEN 'quarterly' THEN (p_date + interval '3 months')::date
    WHEN 'semiannual' THEN (p_date + interval '6 months')::date
    WHEN 'annual' THEN (p_date + interval '1 year')::date
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_recurring_invoices_for_company(p_company_id uuid)
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
    WHERE c.company_id = p_company_id
      AND c.is_active = true
      AND COALESCE(c.auto_generate_invoice, true) = true
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

    v_subtotal := COALESCE(v_contract.subtotal_cents, v_contract.amount_cents);
    v_tax := COALESCE(v_contract.tax_cents, round(v_subtotal * v_contract.tax_rate / 100)::integer);
    v_total := COALESCE(v_contract.total_cents, v_subtotal + v_tax);
    v_year := EXTRACT(YEAR FROM v_contract.next_invoice_date)::integer;

    INSERT INTO public.finance_document_counters (company_id, doc_type, year, last_number)
    VALUES (v_contract.company_id, 'invoice', v_year, 1)
    ON CONFLICT (company_id, doc_type, year)
    DO UPDATE SET last_number = finance_document_counters.last_number + 1
    RETURNING last_number INTO v_next_num;

    v_invoice_number := 'INV-' || v_year::text || '-' || lpad(v_next_num::text, 4, '0');

    INSERT INTO public.invoices (
      company_id, client_id, contract_id, invoice_number, status, kind,
      period_start, period_end, issue_date, due_date,
      client_name, client_company, client_email, client_phone,
      subtotal_cents, tax_rate, tax_cents, total_cents,
      notes, auto_generated
    ) VALUES (
      v_contract.company_id, v_contract.client_id, v_contract.id, v_invoice_number, 'draft', 'recurring',
      v_contract.next_invoice_date, v_period_end, CURRENT_DATE,
      (CURRENT_DATE + interval '14 days')::date,
      COALESCE(v_client.name, 'Client'),
      v_client.contact_name,
      v_client.email,
      v_client.phone,
      v_subtotal, v_contract.tax_rate, v_tax, v_total,
      v_contract.notes,
      true
    )
    RETURNING id INTO v_invoice_id;

    IF EXISTS (SELECT 1 FROM public.contract_items ci WHERE ci.contract_id = v_contract.id) THEN
      INSERT INTO public.invoice_items (
        company_id, invoice_id, description, quantity, unit_price_cents, line_total_cents, sort_order
      )
      SELECT
        v_contract.company_id,
        v_invoice_id,
        ci.description,
        ci.quantity,
        ci.unit_price_cents,
        ci.line_total_cents,
        ci.sort_order
      FROM public.contract_items ci
      WHERE ci.contract_id = v_contract.id
      ORDER BY ci.sort_order;
    ELSE
      INSERT INTO public.invoice_items (
        company_id, invoice_id, description, quantity, unit_price_cents, line_total_cents, sort_order
      ) VALUES (
        v_contract.company_id, v_invoice_id,
        COALESCE(v_contract.service_description, v_contract.title),
        1, v_contract.amount_cents, v_contract.amount_cents, 0
      );
    END IF;

    INSERT INTO public.invoice_events (company_id, invoice_id, event_type, message)
    VALUES (v_contract.company_id, v_invoice_id, 'created', 'Recurring invoice from contract');

    INSERT INTO public.contract_events (company_id, contract_id, event_type, message)
    VALUES (v_contract.company_id, v_contract.id, 'invoice_generated', v_invoice_number);

    UPDATE public.contracts
    SET next_invoice_date = public.finance_advance_date(v_contract.next_invoice_date, v_contract.frequency)
    WHERE id = v_contract.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
