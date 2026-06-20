-- Backfill starter trial subscriptions for companies created before billing migration

insert into public.subscriptions (company_id, plan_key, status, trial_ends_at)
select
  c.id,
  'starter',
  'trialing',
  now() + interval '14 days'
from public.companies c
where not exists (
  select 1 from public.subscriptions s where s.company_id = c.id
);
