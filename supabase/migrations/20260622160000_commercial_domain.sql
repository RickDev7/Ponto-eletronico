-- Commercial domain: single source of truth relationships
-- Workflow: Lead → Qualification → Quote → Approval → Contract → Client

-- Client originates from lead conversion (no duplicate party records)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS source_lead_id uuid REFERENCES public.leads (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_source_lead_unique
  ON public.clients (company_id, source_lead_id)
  WHERE source_lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_source_lead
  ON public.clients (source_lead_id)
  WHERE source_lead_id IS NOT NULL;

-- Contract traces back to quote and lead (finance handoff)
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_quote
  ON public.contracts (quote_id)
  WHERE quote_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_lead
  ON public.contracts (lead_id)
  WHERE lead_id IS NOT NULL;

-- Backfill client source from existing conversions
UPDATE public.clients c
SET source_lead_id = l.id
FROM public.leads l
WHERE l.converted_client_id = c.id
  AND l.company_id = c.company_id
  AND c.source_lead_id IS NULL;

-- Backfill quote.client_id from converted leads
UPDATE public.quotes q
SET client_id = l.converted_client_id
FROM public.leads l
WHERE q.lead_id = l.id
  AND l.converted_client_id IS NOT NULL
  AND q.client_id IS NULL
  AND q.company_id = l.company_id;

-- Backfill contract.quote_id from quotes.contract_id
UPDATE public.contracts c
SET quote_id = q.id,
    lead_id = COALESCE(c.lead_id, q.lead_id)
FROM public.quotes q
WHERE q.contract_id = c.id
  AND q.company_id = c.company_id
  AND c.quote_id IS NULL;
