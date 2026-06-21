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

export async function loadEmployeeSchedule(companyId: string, employeeId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: assignments }, { data: openCheckIn }] = await Promise.all([
    supabase
      .from("task_assignments")
      .select(`
        task:tasks(
          id, title, status, service_type, scheduled_date,
          scheduled_start, scheduled_end, description,
          address:addresses(street, house_number, postal_code, city, latitude, longitude, access_notes,
            client:clients(name))
        )
      `)
      .eq("employee_id", employeeId)
      .eq("company_id", companyId),
    supabase
      .from("check_ins")
      .select("id, check_in_at, task_id, check_in_notes")
      .eq("employee_id", employeeId)
      .eq("company_id", companyId)
      .is("check_out_at", null)
      .maybeSingle(),
  ]);

  const tasks = (assignments ?? [])
    .map((a) => normalizeTask(Array.isArray(a.task) ? a.task[0] : a.task))
    .filter(Boolean) as ScheduleTaskRow[];

  const active = tasks.filter((t) => !["completed", "cancelled"].includes(t.status));
  const todayTasks = active.filter((t) => t.scheduled_date === today);
  const upcomingTasks = active
    .filter((t) => t.scheduled_date > today)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  const weekStart = new Date(today + "T12:00:00");
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const weekTasks = weekDates.map((date) => ({
    date,
    tasks: active.filter((t) => t.scheduled_date === date),
  }));

  return {
    today,
    todayTasks,
    upcomingTasks,
    weekTasks,
    openCheckIn: openCheckIn ?? null,
    activeTaskId: openCheckIn?.task_id ?? null,
  };
}
