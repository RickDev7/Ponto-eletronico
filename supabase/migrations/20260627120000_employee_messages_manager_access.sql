-- Manager dashboard: read threads, attachments storage, push notification on outbound messages

CREATE INDEX IF NOT EXISTS idx_employee_messages_company_thread
  ON public.employee_messages (company_id, thread_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_employee_messages_company_created
  ON public.employee_messages (company_id, created_at DESC);

-- Supervisors+ can read all company employee messages (thread inbox)
DROP POLICY IF EXISTS employee_messages_select_manager ON public.employee_messages;
CREATE POLICY employee_messages_select_manager
  ON public.employee_messages FOR SELECT TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'));

DROP POLICY IF EXISTS employee_messages_update_manager ON public.employee_messages;
CREATE POLICY employee_messages_update_manager
  ON public.employee_messages FOR UPDATE TO authenticated
  USING (private.has_min_role(company_id, 'supervisor'))
  WITH CHECK (private.has_min_role(company_id, 'supervisor'));

-- ─── Storage: message attachments ───────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-message-attachments',
  'employee-message-attachments',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "employee_message_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "employee_message_attachments_insert_manager" ON storage.objects;
DROP POLICY IF EXISTS "employee_message_attachments_insert_employee" ON storage.objects;
DROP POLICY IF EXISTS "employee_message_attachments_delete_manager" ON storage.objects;

CREATE POLICY "employee_message_attachments_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'employee-message-attachments'
    AND private.is_company_member(private.storage_company_id(name))
  );

CREATE POLICY "employee_message_attachments_insert_manager"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'employee-message-attachments'
    AND private.has_min_role(private.storage_company_id(name), 'supervisor')
  );

CREATE POLICY "employee_message_attachments_insert_employee"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'employee-message-attachments'
    AND private.get_employee_id(private.storage_company_id(name)) IS NOT NULL
  );

CREATE POLICY "employee_message_attachments_delete_manager"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'employee-message-attachments'
    AND private.has_min_role(private.storage_company_id(name), 'supervisor')
  );

-- ─── Notify employee when operations sends a message ───────────────────────

CREATE OR REPLACE FUNCTION private.notify_employee_on_manager_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_member_id IS NOT NULL THEN
    PERFORM private.insert_employee_notification(
      NEW.company_id,
      NEW.recipient_employee_id,
      'message',
      COALESCE(NULLIF(trim(NEW.subject), ''), 'Nova mensagem da equipa'),
      left(NEW.body, 280),
      'message',
      NEW.id,
      jsonb_build_object('thread_id', NEW.thread_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employee_messages_notify_employee ON public.employee_messages;
CREATE TRIGGER employee_messages_notify_employee
  AFTER INSERT ON public.employee_messages
  FOR EACH ROW
  WHEN (NEW.sender_member_id IS NOT NULL)
  EXECUTE FUNCTION private.notify_employee_on_manager_message();
