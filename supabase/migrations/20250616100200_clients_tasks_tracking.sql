-- Clients, addresses, tasks, check-ins, photos

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  notes text,
  status public.client_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_company ON public.clients (company_id, status);
CREATE INDEX idx_clients_company_name ON public.clients (company_id, name);

CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  label text,
  street text NOT NULL,
  house_number text,
  postal_code text NOT NULL,
  city text NOT NULL,
  country text NOT NULL DEFAULT 'DE',
  latitude double precision,
  longitude double precision,
  access_notes text,
  service_types public.service_type[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_addresses_company ON public.addresses (company_id, is_active);
CREATE INDEX idx_addresses_client ON public.addresses (client_id);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  address_id uuid NOT NULL REFERENCES public.addresses (id) ON DELETE RESTRICT,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  service_type public.service_type NOT NULL,
  title text NOT NULL,
  description text,
  scheduled_date date NOT NULL,
  scheduled_start time,
  scheduled_end time,
  status public.task_status NOT NULL DEFAULT 'draft',
  priority public.task_priority NOT NULL DEFAULT 'normal',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_company_status_date ON public.tasks (company_id, status, scheduled_date);
CREATE INDEX idx_tasks_address ON public.tasks (address_id);
CREATE INDEX idx_tasks_scheduled ON public.tasks (company_id, scheduled_date DESC);

CREATE TABLE public.task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  UNIQUE (task_id, employee_id)
);

CREATE INDEX idx_task_assignments_employee ON public.task_assignments (employee_id, task_id);
CREATE INDEX idx_task_assignments_company ON public.task_assignments (company_id);

CREATE TABLE public.check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
  check_in_at timestamptz NOT NULL DEFAULT now(),
  check_out_at timestamptz,
  check_in_latitude double precision,
  check_in_longitude double precision,
  check_out_latitude double precision,
  check_out_longitude double precision,
  check_in_notes text,
  check_out_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_out_after_check_in CHECK (
    check_out_at IS NULL OR check_out_at >= check_in_at
  )
);

CREATE INDEX idx_check_ins_company_employee ON public.check_ins (company_id, employee_id, check_in_at DESC);
CREATE INDEX idx_check_ins_task ON public.check_ins (task_id);
CREATE INDEX idx_check_ins_open ON public.check_ins (employee_id) WHERE check_out_at IS NULL;

CREATE TABLE public.task_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  check_in_id uuid REFERENCES public.check_ins (id) ON DELETE SET NULL,
  photo_type public.photo_type NOT NULL,
  storage_path text NOT NULL,
  file_name text,
  file_size integer,
  mime_type text,
  uploaded_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_photos_task ON public.task_photos (task_id, photo_type);
CREATE INDEX idx_task_photos_company ON public.task_photos (company_id, uploaded_at DESC);
