-- Storage buckets & policies

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'task-photos',
    'task-photos',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  ),
  (
    'reports',
    'reports',
    false,
    52428800,
    ARRAY['application/pdf']
  ),
  (
    'company-assets',
    'company-assets',
    false,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  )
ON CONFLICT (id) DO NOTHING;

-- Helper: extract company_id from storage path (first segment)
CREATE OR REPLACE FUNCTION private.storage_company_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT (split_part(object_name, '/', 1))::uuid;
$$;

-- task-photos policies
CREATE POLICY "task_photos_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'task-photos'
    AND private.is_company_member(private.storage_company_id(name))
  );

CREATE POLICY "task_photos_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'task-photos'
    AND private.is_company_member(private.storage_company_id(name))
  );

CREATE POLICY "task_photos_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'task-photos'
    AND private.is_company_member(private.storage_company_id(name))
  )
  WITH CHECK (
    bucket_id = 'task-photos'
    AND private.is_company_member(private.storage_company_id(name))
  );

CREATE POLICY "task_photos_delete_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'task-photos'
    AND private.has_min_role(private.storage_company_id(name), 'admin')
  );

-- reports policies
CREATE POLICY "reports_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'reports'
    AND private.has_min_role(private.storage_company_id(name), 'supervisor')
  );

CREATE POLICY "reports_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'reports'
    AND private.has_min_role(private.storage_company_id(name), 'supervisor')
  );

CREATE POLICY "reports_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'reports'
    AND private.has_min_role(private.storage_company_id(name), 'supervisor')
  )
  WITH CHECK (
    bucket_id = 'reports'
    AND private.has_min_role(private.storage_company_id(name), 'supervisor')
  );

CREATE POLICY "reports_delete_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'reports'
    AND private.has_min_role(private.storage_company_id(name), 'admin')
  );

-- company-assets policies
CREATE POLICY "company_assets_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND private.is_company_member(private.storage_company_id(name))
  );

CREATE POLICY "company_assets_insert_admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-assets'
    AND private.has_min_role(private.storage_company_id(name), 'admin')
  );

CREATE POLICY "company_assets_update_admin"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND private.has_min_role(private.storage_company_id(name), 'admin')
  )
  WITH CHECK (
    bucket_id = 'company-assets'
    AND private.has_min_role(private.storage_company_id(name), 'admin')
  );

CREATE POLICY "company_assets_delete_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND private.has_min_role(private.storage_company_id(name), 'admin')
  );
