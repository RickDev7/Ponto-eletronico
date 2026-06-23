-- Employee PWA: team / operations messaging (field workers inbox)

CREATE TABLE IF NOT EXISTS public.employee_messages (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  thread_id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  recipient_employee_id   uuid        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  sender_employee_id      uuid        REFERENCES public.employees(id) ON DELETE SET NULL,
  sender_member_id        uuid        REFERENCES public.company_members(id) ON DELETE SET NULL,
  subject                 text,
  body                    text        NOT NULL,
  attachment_path         text,
  read_at                 timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_messages_sender_check CHECK (
    sender_employee_id IS NOT NULL OR sender_member_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_employee_messages_recipient
  ON public.employee_messages (company_id, recipient_employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_messages_thread
  ON public.employee_messages (thread_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_employee_messages_unread
  ON public.employee_messages (recipient_employee_id)
  WHERE read_at IS NULL;

ALTER TABLE public.employee_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_messages_select
  ON public.employee_messages FOR SELECT TO authenticated
  USING (recipient_employee_id = private.get_employee_id(company_id));

CREATE POLICY employee_messages_update_read
  ON public.employee_messages FOR UPDATE TO authenticated
  USING (recipient_employee_id = private.get_employee_id(company_id))
  WITH CHECK (recipient_employee_id = private.get_employee_id(company_id));

CREATE POLICY employee_messages_insert_reply
  ON public.employee_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_employee_id = private.get_employee_id(company_id)
    AND recipient_employee_id = private.get_employee_id(company_id)
  );

-- Supervisors / managers can message employees in their company
CREATE POLICY employee_messages_insert_manager
  ON public.employee_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_member_id IN (
      SELECT cm.id
      FROM public.company_members cm
      WHERE cm.company_id = employee_messages.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
        AND cm.role IN ('owner', 'manager', 'supervisor')
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_messages;
