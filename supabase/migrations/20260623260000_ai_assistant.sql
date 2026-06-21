-- AI Operations Assistant: insight history and audit log

CREATE TABLE IF NOT EXISTS public.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  domain text NOT NULL,
  capability text NOT NULL,
  prompt text,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider text NOT NULL DEFAULT 'fallback',
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_company
  ON public.ai_insights (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_insights_capability
  ON public.ai_insights (company_id, capability, created_at DESC);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_insights_select_member" ON public.ai_insights;
CREATE POLICY "ai_insights_select_member"
  ON public.ai_insights FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

DROP POLICY IF EXISTS "ai_insights_insert_supervisor" ON public.ai_insights;
CREATE POLICY "ai_insights_insert_supervisor"
  ON public.ai_insights FOR INSERT TO authenticated
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

COMMENT ON TABLE public.ai_insights IS 'AI assistant capability runs and chat responses per company';
