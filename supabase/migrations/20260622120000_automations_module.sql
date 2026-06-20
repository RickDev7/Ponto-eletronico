-- Automations: Trigger → Condition → Action rules + execution log + delivery outbox

DO $$ BEGIN
  CREATE TYPE public.automation_run_status AS ENUM (
    'pending', 'running', 'success', 'failed', 'skipped'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.automation_delivery_status AS ENUM (
    'queued', 'sent', 'failed', 'skipped'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.automation_delivery_channel AS ENUM (
    'email', 'whatsapp', 'push', 'sms', 'in_app'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automation_rules_name_len CHECK (char_length(name) >= 2)
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_company
  ON public.automation_rules (company_id, is_enabled, trigger_type);

CREATE TABLE IF NOT EXISTS public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  rule_id uuid REFERENCES public.automation_rules (id) ON DELETE SET NULL,
  trigger_type text NOT NULL,
  trigger_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.automation_run_status NOT NULL DEFAULT 'pending',
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_automation_runs_company
  ON public.automation_runs (company_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_runs_rule
  ON public.automation_runs (rule_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.automation_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.automation_runs (id) ON DELETE CASCADE,
  channel public.automation_delivery_channel NOT NULL,
  recipient text,
  subject text,
  body text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.automation_delivery_status NOT NULL DEFAULT 'queued',
  provider text,
  provider_message_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_automation_deliveries_run
  ON public.automation_deliveries (run_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_deliveries_status
  ON public.automation_deliveries (company_id, status, created_at DESC);

CREATE TRIGGER automation_rules_set_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automation_rules_select_member" ON public.automation_rules;
CREATE POLICY "automation_rules_select_member"
  ON public.automation_rules FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

DROP POLICY IF EXISTS "automation_rules_write_supervisor" ON public.automation_rules;
CREATE POLICY "automation_rules_write_supervisor"
  ON public.automation_rules FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

DROP POLICY IF EXISTS "automation_runs_select_member" ON public.automation_runs;
CREATE POLICY "automation_runs_select_member"
  ON public.automation_runs FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

DROP POLICY IF EXISTS "automation_runs_write_supervisor" ON public.automation_runs;
CREATE POLICY "automation_runs_write_supervisor"
  ON public.automation_runs FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

DROP POLICY IF EXISTS "automation_deliveries_select_member" ON public.automation_deliveries;
CREATE POLICY "automation_deliveries_select_member"
  ON public.automation_deliveries FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

DROP POLICY IF EXISTS "automation_deliveries_write_supervisor" ON public.automation_deliveries;
CREATE POLICY "automation_deliveries_write_supervisor"
  ON public.automation_deliveries FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

COMMENT ON TABLE public.automation_rules IS 'Configurable Trigger → Condition → Action automation rules';
COMMENT ON TABLE public.automation_runs IS 'Execution log for automation rules';
COMMENT ON TABLE public.automation_deliveries IS 'Outbox for multi-channel deliveries (email, WhatsApp, push, SMS)';
