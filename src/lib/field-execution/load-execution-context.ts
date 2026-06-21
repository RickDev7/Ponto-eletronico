import "server-only";

import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/config/constants";
import type { ExecutionContext } from "@/lib/field-execution/field-execution-types";
import { loadEmployeeSchedule } from "@/lib/field-execution/load-employee-schedule";

export async function loadExecutionContext(
  companyId: string,
  employeeId: string,
  taskId: string,
): Promise<ExecutionContext | null> {
  const supabase = await createClient();

  const [
    { data: assignment },
    { data: task },
    { data: checklist },
    { data: photos },
    { data: openCheckIn },
    { data: serviceReport },
  ] = await Promise.all([
    supabase
      .from("task_assignments")
      .select("id")
      .eq("task_id", taskId)
      .eq("employee_id", employeeId)
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("tasks")
      .select(`
        id, title, status, service_type, scheduled_date,
        scheduled_start, scheduled_end, description,
        address:addresses(street, house_number, postal_code, city, latitude, longitude, access_notes,
          client:clients(name))
      `)
      .eq("id", taskId)
      .eq("company_id", companyId)
      .single(),
    supabase
      .from("task_checklist_items")
      .select("id, text, is_checked, sort_order")
      .eq("task_id", taskId)
      .eq("company_id", companyId)
      .order("sort_order"),
    supabase
      .from("task_photos")
      .select("id, photo_type, storage_path, file_name")
      .eq("task_id", taskId)
      .eq("company_id", companyId)
      .order("uploaded_at"),
    supabase
      .from("check_ins")
      .select("id, check_in_at, check_in_notes")
      .eq("task_id", taskId)
      .eq("employee_id", employeeId)
      .eq("company_id", companyId)
      .is("check_out_at", null)
      .maybeSingle(),
    supabase
      .from("service_reports")
      .select("id, status, client_name, signed_at, generated_at, storage_path")
      .eq("task_id", taskId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!task) return null;

  const address = Array.isArray(task.address) ? task.address[0] : task.address;
  const photoRows = photos ?? [];
  const paths = photoRows.map((p) => p.storage_path).filter(Boolean) as string[];
  const urlMap: Record<string, string> = {};
  await Promise.all(
    paths.map(async (path) => {
      const { data } = await supabase.storage
        .from(STORAGE_BUCKETS.taskPhotos)
        .createSignedUrl(path, 60 * 60);
      urlMap[path] = data?.signedUrl ?? "";
    }),
  );

  let signedReportUrl: string | null = null;
  if (serviceReport?.storage_path) {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKETS.reports)
      .createSignedUrl(serviceReport.storage_path, 60 * 60);
    signedReportUrl = data?.signedUrl ?? null;
  }

  return {
    task: { ...task, address: address ?? null },
    checklist: checklist ?? [],
    photos: photoRows.map((p) => ({
      ...p,
      signedUrl: urlMap[p.storage_path] ?? null,
    })),
    openCheckIn: openCheckIn ?? null,
    serviceReport: serviceReport
      ? { ...serviceReport, signedReportUrl }
      : null,
    isAssigned: Boolean(assignment),
  };
}

export { loadEmployeeSchedule };
