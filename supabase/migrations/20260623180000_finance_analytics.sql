-- Finance analytics: expenses ledger + service linkage on invoice lines

CREATE TABLE IF NOT EXISTS public.finance_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'operational',
  description text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  vendor text,
  reference text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_expenses_company
  ON public.finance_expenses (company_id, expense_date DESC);

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_items_service
  ON public.invoice_items (service_id) WHERE service_id IS NOT NULL;

ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_expenses_select_member"
  ON public.finance_expenses FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "finance_expenses_write_supervisor"
  ON public.finance_expenses FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));
