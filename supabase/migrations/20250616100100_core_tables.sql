-- Core tenant & identity tables

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  legal_name text,
  tax_id text,
  email text,
  phone text,
  logo_url text,
  settings jsonb NOT NULL DEFAULT '{
    "locale": "de-DE",
    "timezone": "Europe/Berlin",
    "currency": "EUR"
  }'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT companies_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE INDEX idx_companies_slug ON public.companies (slug);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  phone text,
  locale text NOT NULL DEFAULT 'de-DE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.member_role NOT NULL DEFAULT 'employee',
  status public.member_status NOT NULL DEFAULT 'active',
  invited_at timestamptz,
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);

CREATE INDEX idx_company_members_user ON public.company_members (user_id, status);
CREATE INDEX idx_company_members_company ON public.company_members (company_id, role);

CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  member_id uuid UNIQUE REFERENCES public.company_members (id) ON DELETE SET NULL,
  employee_number text,
  full_name text NOT NULL,
  email text,
  phone text,
  status public.employee_status NOT NULL DEFAULT 'active',
  hire_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, employee_number)
);

CREATE INDEX idx_employees_company ON public.employees (company_id, status);
CREATE INDEX idx_employees_member ON public.employees (member_id) WHERE member_id IS NOT NULL;

CREATE TABLE public.company_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.member_role NOT NULL DEFAULT 'employee',
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  invited_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, email)
);

CREATE INDEX idx_company_invites_token ON public.company_invites (token_hash) WHERE accepted_at IS NULL;
