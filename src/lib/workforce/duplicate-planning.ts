import type { SupabaseClient } from "@supabase/supabase-js";

export interface PlanningTaskSnapshot {
  title: string;
  description: string | null;
  service_type: string;
  service_id: string | null;
  address_id: string;
  contract_id: string | null;
  scheduled_date: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  shift_type: string | null;
  break_minutes: number;
  travel_minutes: number;
  priority: string;
}

const ASSIGNMENT_SELECT = `
  employee_id,
  task:tasks(
    id, title, description, service_type, service_id, address_id, contract_id,
    scheduled_date, scheduled_start, scheduled_end, shift_type, break_minutes, travel_minutes,
    priority, company_id, created_by
  )
`;

function parseTask(row: { task: unknown }): PlanningTaskSnapshot | null {
  const task = Array.isArray(row.task) ? row.task[0] : row.task;
  if (!task || typeof task !== "object") return null;
  const t = task as Record<string, unknown>;
  if (!t.address_id) return null;
  return {
    title: t.title as string,
    description: (t.description as string | null) ?? null,
    service_type: t.service_type as string,
    service_id: (t.service_id as string | null) ?? null,
    address_id: t.address_id as string,
    contract_id: (t.contract_id as string | null) ?? null,
    scheduled_date: t.scheduled_date as string,
    scheduled_start: (t.scheduled_start as string | null) ?? null,
    scheduled_end: (t.scheduled_end as string | null) ?? null,
    shift_type: (t.shift_type as string | null) ?? null,
    break_minutes: Number(t.break_minutes ?? 0),
    travel_minutes: Number(t.travel_minutes ?? 0),
    priority: (t.priority as string) ?? "normal",
  };
}

export async function clonePlanningAssignment(
  supabase: SupabaseClient,
  params: {
    companyId: string;
    createdBy: string;
    employeeId: string;
    task: PlanningTaskSnapshot;
    newDateStr: string;
  },
): Promise<boolean> {
  const { companyId, createdBy, employeeId, task, newDateStr } = params;

  const { data: existing } = await supabase
    .from("tasks")
    .select("id")
    .eq("company_id", companyId)
    .eq("contract_id", task.contract_id)
    .eq("scheduled_date", newDateStr)
    .eq("title", task.title)
    .maybeSingle();

  if (existing) return false;

  const { data: newTask, error } = await supabase
    .from("tasks")
    .insert({
      company_id: companyId,
      address_id: task.address_id,
      contract_id: task.contract_id,
      service_id: task.service_id,
      title: task.title,
      description: task.description,
      service_type: task.service_type,
      scheduled_date: newDateStr,
      scheduled_start: task.scheduled_start,
      scheduled_end: task.scheduled_end,
      shift_type: task.shift_type,
      break_minutes: task.break_minutes,
      travel_minutes: task.travel_minutes,
      priority: task.priority,
      status: "scheduled",
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (error || !newTask) return false;

  const { error: assignError } = await supabase.from("task_assignments").insert({
    company_id: companyId,
    task_id: newTask.id,
    employee_id: employeeId,
    assigned_by: createdBy,
  });

  return !assignError;
}

export async function copyDateRangePlanning(
  supabase: SupabaseClient,
  params: {
    companyId: string;
    createdBy: string;
    from: string;
    to: string;
    dayOffset: number;
    targetEnd?: string;
  },
): Promise<number> {
  const { companyId, createdBy, from, to, dayOffset, targetEnd } = params;

  const { data: assignments } = await supabase
    .from("task_assignments")
    .select(ASSIGNMENT_SELECT)
    .eq("company_id", companyId);

  let count = 0;
  for (const row of assignments ?? []) {
    const task = parseTask(row);
    if (!task) continue;
    if (task.scheduled_date < from || task.scheduled_date > to) continue;

    const newDate = new Date(task.scheduled_date + "T12:00:00");
    newDate.setDate(newDate.getDate() + dayOffset);
    const newDateStr = newDate.toISOString().slice(0, 10);
    if (targetEnd && newDateStr > targetEnd) continue;

    const cloned = await clonePlanningAssignment(supabase, {
      companyId,
      createdBy,
      employeeId: row.employee_id as string,
      task,
      newDateStr,
    });
    if (cloned) count += 1;
  }

  return count;
}

export function monthBounds(monthStart: string): { from: string; to: string } {
  const first = new Date(monthStart + "T12:00:00");
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
}

export function mapDateToTargetMonth(sourceDate: string, targetMonthStart: string): string {
  const source = new Date(sourceDate + "T12:00:00");
  const target = new Date(targetMonthStart + "T12:00:00");
  const day = source.getDate();
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export async function copyMonthPlanning(
  supabase: SupabaseClient,
  params: {
    companyId: string;
    createdBy: string;
    targetMonthStart: string;
  },
): Promise<number> {
  const { companyId, createdBy, targetMonthStart } = params;
  const target = new Date(targetMonthStart + "T12:00:00");
  const source = new Date(target);
  source.setMonth(source.getMonth() - 1);
  const sourceStart = source.toISOString().slice(0, 10);
  const { from, to } = monthBounds(sourceStart);
  const { to: targetEnd } = monthBounds(targetMonthStart);

  const { data: assignments } = await supabase
    .from("task_assignments")
    .select(ASSIGNMENT_SELECT)
    .eq("company_id", companyId);

  let count = 0;
  for (const row of assignments ?? []) {
    const task = parseTask(row);
    if (!task) continue;
    if (task.scheduled_date < from || task.scheduled_date > to) continue;

    const newDateStr = mapDateToTargetMonth(task.scheduled_date, targetMonthStart);
    if (newDateStr > targetEnd) continue;

    const cloned = await clonePlanningAssignment(supabase, {
      companyId,
      createdBy,
      employeeId: row.employee_id as string,
      task,
      newDateStr,
    });
    if (cloned) count += 1;
  }

  return count;
}

export { ASSIGNMENT_SELECT, parseTask };
