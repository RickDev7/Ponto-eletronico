import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ScheduleTaskRow } from "@/lib/field-execution/field-execution-types";

function normalizeTask(raw: unknown): ScheduleTaskRow | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as ScheduleTaskRow;
  if (!t.id) return null;
  const address = Array.isArray(t.address) ? t.address[0] : t.address;
  return { ...t, address: address ?? null };
}

const TASK_SELECT = `
  task:tasks(
    id, title, status, priority, service_type, scheduled_date,
    scheduled_start, scheduled_end, description,
    address:addresses(street, house_number, postal_code, city, latitude, longitude, access_notes,
      client:clients(name, phone))
  )
`;

export type EmployeeJobRow = ScheduleTaskRow;

export async function loadEmployeeJobs(companyId: string, employeeId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: assignments }, { data: openCheckIn }] = await Promise.all([
    supabase
      .from("task_assignments")
      .select(TASK_SELECT)
      .eq("employee_id", employeeId)
      .eq("company_id", companyId),
    supabase
      .from("check_ins")
      .select("id, task_id")
      .eq("employee_id", employeeId)
      .eq("company_id", companyId)
      .is("check_out_at", null)
      .maybeSingle(),
  ]);

  const jobs = (assignments ?? [])
    .map((a) => normalizeTask(Array.isArray(a.task) ? a.task[0] : a.task))
    .filter(Boolean) as EmployeeJobRow[];

  const active = jobs.filter((j) => !["cancelled"].includes(j.status));
  const todayJobs = active.filter((j) => j.scheduled_date === today);
  const pending = active.filter((j) =>
    ["draft", "scheduled"].includes(j.status),
  );
  const inProgress = active.filter((j) => j.status === "in_progress");
  const completed = jobs.filter((j) => j.status === "completed");

  return {
    today,
    jobs: active.sort((a, b) => {
      const d = a.scheduled_date.localeCompare(b.scheduled_date);
      if (d !== 0) return d;
      return (a.scheduled_start ?? "").localeCompare(b.scheduled_start ?? "");
    }),
    todayJobs,
    pending,
    inProgress,
    completed: completed.sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date)),
    activeTaskId: openCheckIn?.task_id ?? null,
  };
}
