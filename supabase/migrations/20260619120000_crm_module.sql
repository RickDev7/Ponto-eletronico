-- CRM module: leads, contacts, events (feeds Clients/Quotes/Contracts)

DO $$ BEGIN
  CREATE TYPE public.lead_status AS ENUM (
    'new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  company_name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  website text,
  city text,
  country text NOT NULL DEFAULT 'DE',
  estimated_value_cents integer NOT NULL DEFAULT 0,
  notes text,
  status public.lead_status NOT NULL DEFAULT 'new',
  owner_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  converted_client_id uuid REFERENCES public.clients (id) ON DELETE SET NULL,
  converted_quote_id uuid REFERENCES public.quotes (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_company_status ON public.leads (company_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_company_owner ON public.leads (company_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_created ON public.leads (company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.lead_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads (id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  role_title text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_contacts_lead ON public.lead_contacts (lead_id);

CREATE TABLE IF NOT EXISTS public.lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON public.lead_events (lead_id, created_at DESC);

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_lead ON public.quotes (lead_id) WHERE lead_id IS NOT NULL;

CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_select_member"
  ON public.leads FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "leads_write_supervisor"
  ON public.leads FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "lead_contacts_select_member"
  ON public.lead_contacts FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "lead_contacts_write_supervisor"
  ON public.lead_contacts FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

CREATE POLICY "lead_events_select_member"
  ON public.lead_events FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "lead_events_write_supervisor"
  ON public.lead_events FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));
