-- Automation engine: idempotency keys to prevent duplicate runs (e.g. daily invoice reminders)

CREATE TABLE IF NOT EXISTS public.automation_dedup (
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  rule_id uuid NOT NULL REFERENCES public.automation_rules (id) ON DELETE CASCADE,
  dedupe_key text NOT NULL,
  last_run_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, rule_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_automation_dedup_last_run
  ON public.automation_dedup (company_id, last_run_at DESC);

ALTER TABLE public.automation_dedup ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automation_dedup_supervisor" ON public.automation_dedup;
CREATE POLICY "automation_dedup_supervisor"
  ON public.automation_dedup FOR ALL TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

COMMENT ON TABLE public.automation_dedup IS 'Idempotency keys — prevents duplicate automation runs for the same entity';
