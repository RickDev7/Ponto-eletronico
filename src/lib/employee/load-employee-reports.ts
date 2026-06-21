import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ExecutionContext } from "@/lib/field-execution/field-execution-types";

export interface EmployeeServiceReportRow {
  id: string;
  status: string;
  client_name: string | null;
  signed_at: string | null;
  generated_at: string | null;
  storage_path: string | null;
  task: {
    id: string;
    title: string;
    scheduled_date: string;
    service_type: string;
    address: {
      street: string;
      city: string;
      client: { name: string } | Array<{ name: string }> | null;
    } | Array<{
      street: string;
      city: string;
      client: { name: string } | Array<{ name: string }> | null;
    }> | null;
  } | null;
}

export async function loadEmployeeServiceReports(
  companyId: string,
  employeeId: string,
): Promise<EmployeeServiceReportRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("service_reports")
    .select(`
      id, status, client_name, signed_at, generated_at, storage_path,
      task:tasks(id, title, scheduled_date, service_type,
        address:addresses(street, city, client:clients(name)))
    `)
    .eq("company_id", companyId)
    .eq("employee_id", employeeId)
    .in("status", ["signed", "generated"])
    .order("generated_at", { ascending: false, nullsFirst: false })
    .limit(50);

  return (data ?? []) as EmployeeServiceReportRow[];
}

export type { ExecutionContext };
