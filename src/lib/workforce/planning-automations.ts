import { emitAutomationEvent } from "@/lib/automations/engine";
import { createClient } from "@/lib/supabase/server";
import { loadShifts, loadWorkforceEmployees } from "@/lib/workforce/load-workforce-data";
import { shiftDurationMinutes } from "@/lib/workforce/planning-data";
import type { ShiftRow } from "@/lib/workforce/workforce-data";

function weekBounds(dateStr: string): { start: string; end: string } {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const start = d.toISOString().slice(0, 10);
  const endDate = new Date(d);
  endDate.setDate(endDate.getDate() + 6);
  return { start, end: endDate.toISOString().slice(0, 10) };
}

function employeeWeekMinutes(shifts: ShiftRow[], employeeId: string, start: string, end: string) {
  return shifts
    .filter((s) => s.employeeId === employeeId && s.scheduledDate >= start && s.scheduledDate <= end)
    .reduce((a, s) => a + shiftDurationMinutes(s), 0);
}

export async function emitWeeklyHoursExceededEvents(
  companyId: string,
  slug: string | undefined,
  shifts: ShiftRow[],
  employees: Array<{ id: string; full_name: string; weekly_hours: number | null }>,
) {
  const today = new Date().toISOString().slice(0, 10);
  const { start, end } = weekBounds(today);

  for (const emp of employees) {
    const weeklyHours = Number(emp.weekly_hours ?? 40);
    const capacityMinutes = weeklyHours * 60;
    const planned = employeeWeekMinutes(shifts, emp.id, start, end);
    if (planned <= capacityMinutes) continue;

    const hasConflict = shifts.some(
      (s) => s.employeeId === emp.id && s.conflicts.includes("weekly_hours"),
    );
    if (!hasConflict) continue;

    void emitAutomationEvent({
      companyId,
      slug,
      trigger: "weekly_hours.exceeded",
      payload: {
        employeeId: emp.id,
        employeeName: emp.full_name,
        weeklyHours,
        plannedMinutes: planned,
        excessMinutes: planned - capacityMinutes,
        weekStart: start,
        weekEnd: end,
        entityType: "employee",
        entityId: emp.id,
      },
    });
  }
}

export async function emitShiftEmptyEvents(
  companyId: string,
  slug: string | undefined,
  from: string,
  to: string,
) {
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, scheduled_date, address:addresses(label, street, city)")
    .eq("company_id", companyId)
    .gte("scheduled_date", from)
    .lte("scheduled_date", to)
    .not("status", "eq", "cancelled");

  if (!tasks?.length) return;

  const { data: assignments } = await supabase
    .from("task_assignments")
    .select("task_id")
    .eq("company_id", companyId)
    .in(
      "task_id",
      tasks.map((t) => t.id),
    );

  const assigned = new Set((assignments ?? []).map((a) => a.task_id as string));
  const unassigned = tasks.filter((t) => !assigned.has(t.id as string));

  for (const task of unassigned.slice(0, 20)) {
    const addr = Array.isArray(task.address) ? task.address[0] : task.address;
    const location =
      addr && typeof addr === "object"
        ? `${(addr as { label?: string; street?: string }).label ?? (addr as { street?: string }).street}, ${(addr as { city?: string }).city}`
        : "—";

    void emitAutomationEvent({
      companyId,
      slug,
      trigger: "shift.empty",
      payload: {
        taskId: task.id,
        taskTitle: task.title,
        scheduledDate: task.scheduled_date,
        location,
        entityType: "task",
        entityId: task.id,
      },
    });
  }
}

export async function checkPlanningAutomations(companyId: string, slug?: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { start, end } = weekBounds(today);

  const [shifts, employees] = await Promise.all([
    loadShifts(companyId, start, end),
    loadWorkforceEmployees(companyId),
  ]);

  await Promise.all([
    emitWeeklyHoursExceededEvents(companyId, slug, shifts, employees),
    emitShiftEmptyEvents(companyId, slug, start, end),
  ]);
}

export async function scanWorkforcePlanningAutomations(): Promise<number> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  const { data: rules } = await supabase
    .from("automation_rules")
    .select("company_id, trigger_type")
    .eq("is_enabled", true)
    .in("trigger_type", ["shift.empty", "weekly_hours.exceeded"]);

  const companyIds = [...new Set((rules ?? []).map((r) => r.company_id))];
  let processed = 0;

  for (const companyId of companyIds) {
    const { data: company } = await supabase
      .from("companies")
      .select("slug")
      .eq("id", companyId)
      .single();

    await checkPlanningAutomations(companyId, company?.slug);
    processed += 1;
  }

  return processed;
}
