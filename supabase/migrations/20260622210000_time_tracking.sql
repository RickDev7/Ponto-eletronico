-- Time tracking: actual breaks/travel on check-ins + payroll breakdown on time account

ALTER TABLE public.check_ins
  ADD COLUMN IF NOT EXISTS break_minutes_actual integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS travel_minutes_actual integer NOT NULL DEFAULT 0;

ALTER TABLE public.time_account_entries
  ADD COLUMN IF NOT EXISTS planned_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS break_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS travel_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_worked_minutes integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_time_account_company_date
  ON public.time_account_entries (company_id, entry_date DESC);
