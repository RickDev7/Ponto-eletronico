-- Triggers: updated_at, profile creation, onboarding RPC, activity logging

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_company_members_updated_at
  BEFORE UPDATE ON public.company_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_check_ins_updated_at
  BEFORE UPDATE ON public.check_ins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Onboarding: create company + admin membership + employee record
CREATE OR REPLACE FUNCTION public.create_company_with_admin(
  p_name text,
  p_slug text,
  p_legal_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_member_id uuid;
  v_full_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = auth.uid() AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'User already belongs to a company';
  END IF;

  INSERT INTO public.companies (name, slug, legal_name)
  VALUES (p_name, p_slug, p_legal_name)
  RETURNING id INTO v_company_id;

  INSERT INTO public.company_members (company_id, user_id, role, status, joined_at)
  VALUES (v_company_id, auth.uid(), 'admin', 'active', now())
  RETURNING id INTO v_member_id;

  SELECT full_name INTO v_full_name FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.employees (company_id, member_id, full_name, email, status)
  SELECT v_company_id, v_member_id, COALESCE(v_full_name, ''), u.email, 'active'
  FROM auth.users u WHERE u.id = auth.uid();

  INSERT INTO public.activity_logs (company_id, user_id, entity_type, entity_id, action, metadata)
  VALUES (
    v_company_id,
    auth.uid(),
    'company',
    v_company_id,
    'created',
    jsonb_build_object('name', p_name, 'slug', p_slug)
  );

  RETURN v_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_company_with_admin(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_company_with_admin(text, text, text) TO authenticated;

-- Activity log on task status change
CREATE OR REPLACE FUNCTION public.log_task_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.activity_logs (company_id, user_id, entity_type, entity_id, action, metadata)
    VALUES (
      NEW.company_id,
      auth.uid(),
      'task',
      NEW.id,
      'status_changed',
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );

    IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
      NEW.completed_at = now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_task_status_change
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_task_status_change();

-- Sync company_id on task_assignments from task
CREATE OR REPLACE FUNCTION public.sync_assignment_company_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  SELECT company_id INTO NEW.company_id FROM public.tasks WHERE id = NEW.task_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assignment_company_id
  BEFORE INSERT OR UPDATE ON public.task_assignments
  FOR EACH ROW EXECUTE FUNCTION public.sync_assignment_company_id();
