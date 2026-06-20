-- Billing & subscriptions (Stripe)
-- Run after core_tables migration

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'unpaid',
  'paused'
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan_key text not null default 'starter',
  status public.subscription_status not null default 'trialing',
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id)
);

create index subscriptions_company_id_idx on public.subscriptions (company_id);
create index subscriptions_stripe_customer_id_idx on public.subscriptions (stripe_customer_id);
create index subscriptions_status_idx on public.subscriptions (status);

create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  stripe_event_id text not null unique,
  event_type text not null,
  payload jsonb not null default '{}',
  processed_at timestamptz not null default now()
);

create index billing_events_company_id_idx on public.billing_events (company_id);
create index billing_events_event_type_idx on public.billing_events (event_type);

alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;

-- Company admins can read their subscription
create policy subscriptions_select_admin on public.subscriptions
  for select
  using (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = subscriptions.company_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and cm.role = 'admin'
    )
  );

-- Service role / webhooks use service key (bypass RLS)

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

comment on table public.subscriptions is 'Stripe subscription state per company (1:1)';
comment on table public.billing_events is 'Idempotent Stripe webhook event log';
