-- Personnel planning: shift metadata on tasks (escalas = task_assignments + tasks)

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS shift_type text,
  ADD COLUMN IF NOT EXISTS break_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS travel_minutes integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.tasks.shift_type IS 'morning | afternoon | night | custom';
COMMENT ON COLUMN public.tasks.break_minutes IS 'Planned break duration for workforce planning';
COMMENT ON COLUMN public.tasks.travel_minutes IS 'Planned travel time before shift';

CREATE INDEX IF NOT EXISTS idx_tasks_shift_type
  ON public.tasks (company_id, shift_type)
  WHERE shift_type IS NOT NULL;
