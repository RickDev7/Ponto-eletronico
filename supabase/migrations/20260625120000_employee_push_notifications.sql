-- Employee PWA Phase 5: in-app notifications + Web Push subscriptions

CREATE TABLE IF NOT EXISTS public.employee_push_subscriptions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text        NOT NULL,
  p256dh      text        NOT NULL,
  auth_key    text        NOT NULL,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_employee_push_subscriptions_employee
  ON public.employee_push_subscriptions (company_id, employee_id);

CREATE TABLE IF NOT EXISTS public.employee_notifications (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id  uuid        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  kind         text        NOT NULL,
  title        text        NOT NULL,
  body         text,
  payload      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  entity_type  text,
  entity_id    uuid,
  read_at      timestamptz,
  push_sent_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_notifications_employee
  ON public.employee_notifications (company_id, employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_notifications_unread
  ON public.employee_notifications (employee_id)
  WHERE read_at IS NULL;

ALTER TABLE public.employee_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_notifications ENABLE ROW LEVEL SECURITY;

-- ─── RLS: push subscriptions ───────────────────────────────────────────────

CREATE POLICY employee_push_subscriptions_select
  ON public.employee_push_subscriptions FOR SELECT TO authenticated
  USING (employee_id = private.get_employee_id(company_id));

CREATE POLICY employee_push_subscriptions_insert
  ON public.employee_push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = private.get_employee_id(company_id)
    AND user_id = (SELECT auth.uid())
  );

CREATE POLICY employee_push_subscriptions_update
  ON public.employee_push_subscriptions FOR UPDATE TO authenticated
  USING (employee_id = private.get_employee_id(company_id))
  WITH CHECK (
    employee_id = private.get_employee_id(company_id)
    AND user_id = (SELECT auth.uid())
  );

CREATE POLICY employee_push_subscriptions_delete
  ON public.employee_push_subscriptions FOR DELETE TO authenticated
  USING (employee_id = private.get_employee_id(company_id));

-- ─── RLS: notifications ────────────────────────────────────────────────────

CREATE POLICY employee_notifications_select
  ON public.employee_notifications FOR SELECT TO authenticated
  USING (employee_id = private.get_employee_id(company_id));

CREATE POLICY employee_notifications_update
  ON public.employee_notifications FOR UPDATE TO authenticated
  USING (employee_id = private.get_employee_id(company_id))
  WITH CHECK (employee_id = private.get_employee_id(company_id));

-- ─── Secure insert helper (triggers only) ──────────────────────────────────

CREATE OR REPLACE FUNCTION private.insert_employee_notification(
  p_company_id  uuid,
  p_employee_id uuid,
  p_kind        text,
  p_title       text,
  p_body        text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id   uuid DEFAULT NULL,
  p_payload     jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.employee_notifications (
    company_id, employee_id, kind, title, body,
    entity_type, entity_id, payload
  ) VALUES (
    p_company_id, p_employee_id, p_kind, p_title, p_body,
    p_entity_type, p_entity_id, p_payload
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.insert_employee_notification(uuid, uuid, text, text, text, text, uuid, jsonb)
  FROM anon, authenticated;

-- ─── Trigger: task assigned ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.notify_employee_on_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_title text;
  v_scheduled  date;
  v_slug       text;
BEGIN
  SELECT t.title, t.scheduled_date, c.slug
  INTO v_task_title, v_scheduled, v_slug
  FROM public.tasks t
  INNER JOIN public.companies c ON c.id = t.company_id
  WHERE t.id = NEW.task_id;

  PERFORM private.insert_employee_notification(
    NEW.company_id,
    NEW.employee_id,
    'task_assigned',
    'Novo serviço atribuído',
    COALESCE(v_task_title, 'Serviço'),
    'task',
    NEW.task_id,
    jsonb_build_object(
      'slug', v_slug,
      'taskId', NEW.task_id,
      'scheduledDate', v_scheduled
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_employee_task_assigned ON public.task_assignments;
CREATE TRIGGER trg_notify_employee_task_assigned
  AFTER INSERT ON public.task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION private.notify_employee_on_task_assigned();

REVOKE EXECUTE ON FUNCTION private.notify_employee_on_task_assigned() FROM anon, authenticated;

-- ─── Trigger: vacation status ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.notify_employee_on_vacation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_kind text;
  v_title text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('approved', 'rejected') THEN
    RETURN NEW;
  END IF;

  SELECT slug INTO v_slug FROM public.companies WHERE id = NEW.company_id;

  v_kind := CASE NEW.status WHEN 'approved' THEN 'vacation_approved' ELSE 'vacation_rejected' END;
  v_title := CASE NEW.status
    WHEN 'approved' THEN 'Pedido de férias aprovado'
    ELSE 'Pedido de férias recusado'
  END;

  PERFORM private.insert_employee_notification(
    NEW.company_id,
    NEW.employee_id,
    v_kind,
    v_title,
    NEW.start_date::text || ' — ' || NEW.end_date::text,
    'vacation_request',
    NEW.id,
    jsonb_build_object('slug', v_slug, 'requestId', NEW.id, 'status', NEW.status)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_employee_vacation_status ON public.vacation_requests;
CREATE TRIGGER trg_notify_employee_vacation_status
  AFTER UPDATE OF status ON public.vacation_requests
  FOR EACH ROW
  EXECUTE FUNCTION private.notify_employee_on_vacation_status();

REVOKE EXECUTE ON FUNCTION private.notify_employee_on_vacation_status() FROM anon, authenticated;

-- Realtime for in-app feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_notifications;

-- Background push (app fechada): configurar Database Webhook no Supabase Dashboard
--   Tabela: employee_notifications | Evento: INSERT
--   URL: https://<app>/api/internal/push/dispatch
--   Header: x-push-webhook-secret = PUSH_WEBHOOK_SECRET
-- Alternativa: Edge Function supabase/functions/push-dispatch
