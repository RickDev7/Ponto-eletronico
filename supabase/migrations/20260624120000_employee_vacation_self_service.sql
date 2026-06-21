-- Employee self-service: submit and cancel own vacation requests

DROP POLICY IF EXISTS "vacation_requests_employee_insert" ON public.vacation_requests;
CREATE POLICY "vacation_requests_employee_insert"
  ON public.vacation_requests FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = private.get_employee_id(company_id)
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "vacation_requests_employee_cancel" ON public.vacation_requests;
CREATE POLICY "vacation_requests_employee_cancel"
  ON public.vacation_requests FOR UPDATE TO authenticated
  USING (
    employee_id = private.get_employee_id(company_id)
    AND status = 'pending'
  )
  WITH CHECK (
    employee_id = private.get_employee_id(company_id)
    AND status = 'cancelled'
  );
