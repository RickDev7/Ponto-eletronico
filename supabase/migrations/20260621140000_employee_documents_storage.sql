-- Employee documents storage bucket (idempotent)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-documents',
  'employee-documents',
  false,
  20971520,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "employee_documents_select" ON storage.objects;
DROP POLICY IF EXISTS "employee_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "employee_documents_update" ON storage.objects;
DROP POLICY IF EXISTS "employee_documents_delete" ON storage.objects;

CREATE POLICY "employee_documents_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND private.is_company_member(private.storage_company_id(name))
  );

CREATE POLICY "employee_documents_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'employee-documents'
    AND private.has_min_role(private.storage_company_id(name), 'supervisor')
  );

CREATE POLICY "employee_documents_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND private.has_min_role(private.storage_company_id(name), 'supervisor')
  )
  WITH CHECK (
    bucket_id = 'employee-documents'
    AND private.has_min_role(private.storage_company_id(name), 'supervisor')
  );

CREATE POLICY "employee_documents_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND private.has_min_role(private.storage_company_id(name), 'supervisor')
  );
