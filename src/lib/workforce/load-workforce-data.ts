import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/config/constants";
import { syncEmployeeAvailabilityStatuses } from "@/lib/workforce/sync-availability";
import {
  detectShiftConflicts,
  minutesBetween,
  type AbsenceRow,
  type ShiftRow,
  type TimeAccountSummary,
  type VacationRequestRow,
  type WorktimePolicyRow,
  type WorkforceEmployeeRow,
} from "@/lib/workforce/workforce-data";

export async function loadWorkforceEmployees(companyId: string): Promise<WorkforceEmployeeRow[]> {
  await syncEmployeeAvailabilityStatuses(companyId);
  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select(`
      *,
      supervisor:employees!employees_supervisor_id_fkey(full_name)
    `)
    .eq("company_id", companyId)
    .neq("status", "terminated")
    .order("full_name");
  return (data ?? []) as WorkforceEmployeeRow[];
}

export async function loadEmployeeProfile(companyId: string, employeeId: string) {
  await syncEmployeeAvailabilityStatuses(companyId);
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: employee },
    { data: teamMember },
    { data: vacations },
    { data: absences },
    { data: timeEntries },
    { data: documents },
    { data: assignments },
  ] = await Promise.all([
    supabase
      .from("employees")
      .select("*, supervisor:employees!employees_supervisor_id_fkey(full_name)")
      .eq("id", employeeId)
      .eq("company_id", companyId)
      .single(),
    supabase
      .from("team_members")
      .select("team_id, team:teams(name)")
      .eq("employee_id", employeeId)
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("vacation_requests")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("company_id", companyId)
      .order("start_date", { ascending: false })
      .limit(20),
    supabase
      .from("employee_absences")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("company_id", companyId)
      .order("start_date", { ascending: false })
      .limit(20),
    supabase
      .from("time_account_entries")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("company_id", companyId)
      .order("entry_date", { ascending: false })
      .limit(60),
    supabase
      .from("employee_documents")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("task_assignments")
      .select(`
        id, employee_id,
        task:tasks(id, title, status, scheduled_date, scheduled_start, scheduled_end,
          address:addresses(label, street, city))
      `)
      .eq("employee_id", employeeId)
      .eq("company_id", companyId)
      .limit(40),
  ]);

  return {
    employee: employee ? { ...employee, team: teamMember } : null,
    vacations: vacations ?? [],
    absences: absences ?? [],
    timeEntries: timeEntries ?? [],
    documents: await attachDocumentSignedUrls(documents ?? []),
    upcomingShifts: assignments ?? [],
  };
}

async function attachDocumentSignedUrls<T extends { storage_path?: string | null }>(
  docs: T[],
): Promise<Array<T & { signedUrl: string | null }>> {
  if (!docs.length) return [];
  const supabase = await createClient();
  const paths = docs.map((d) => d.storage_path).filter(Boolean) as string[];

  const urlMap: Record<string, string> = {};
  await Promise.all(
    paths.map(async (path) => {
      const { data } = await supabase.storage
        .from(STORAGE_BUCKETS.employeeDocuments)
        .createSignedUrl(path, 60 * 60);
      urlMap[path] = data?.signedUrl ?? "";
    }),
  );

  return docs.map((d) => ({
    ...d,
    signedUrl: d.storage_path ? urlMap[d.storage_path] ?? null : null,
  }));
}

export async function loadVacationRequests(companyId: string): Promise<VacationRequestRow[]> {
  await syncEmployeeAvailabilityStatuses(companyId);
  const supabase = await createClient();
  const { data } = await supabase
    .from("vacation_requests")
    .select("*, employee:employees(full_name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return (data ?? []) as VacationRequestRow[];
}

export async function loadAbsences(companyId: string): Promise<AbsenceRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employee_absences")
    .select("*, employee:employees(full_name)")
    .eq("company_id", companyId)
    .order("start_date", { ascending: false });
  return (data ?? []) as AbsenceRow[];
}

export async function loadWorktimePolicy(companyId: string): Promise<WorktimePolicyRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("worktime_policies")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  return data as WorktimePolicyRow | null;
}

export async function loadTimeAccountSummaries(companyId: string): Promise<TimeAccountSummary[]> {
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  const from = monthStart.toISOString().slice(0, 10);

  const [{ data: employees }, { data: entries }] = await Promise.all([
    supabase
      .from("employees")
      .select("id, full_name, weekly_hours")
      .eq("company_id", companyId)
      .eq("status", "active"),
    supabase
      .from("time_account_entries")
      .select("employee_id, soll_minutes, ist_minutes, balance_delta_minutes")
      .eq("company_id", companyId)
      .gte("entry_date", from),
  ]);

  return (employees ?? []).map((emp) => {
    const empEntries = (entries ?? []).filter((e) => e.employee_id === emp.id);
    const soll = empEntries.reduce((a, e) => a + (e.soll_minutes ?? 0), 0);
    const ist = empEntries.reduce((a, e) => a + (e.ist_minutes ?? 0), 0);
    const balance = empEntries.reduce((a, e) => a + (e.balance_delta_minutes ?? 0), 0);
    const weeklyHours = Number(emp.weekly_hours ?? 40);
    const expectedMonthMinutes = Math.round(weeklyHours * 60 * 4.33);
    return {
      employeeId: emp.id,
      employeeName: emp.full_name,
      weeklyHours,
      sollMinutes: soll || expectedMonthMinutes,
      istMinutes: ist,
      balanceMinutes: balance || ist - (soll || expectedMonthMinutes),
      overtimeMinutes: Math.max(0, ist - (soll || expectedMonthMinutes)),
    };
  });
}

export async function loadShifts(companyId: string, from: string, to: string): Promise<ShiftRow[]> {
  const supabase = await createClient();

  const [{ data: assignments }, { data: vacations }, { data: absences }, { data: employees }] =
    await Promise.all([
      supabase
        .from("task_assignments")
        .select(`
          id, employee_id,
          employee:employees(full_name, weekly_hours),
          task:tasks(
            id, title, status, scheduled_date, scheduled_start, scheduled_end,
            shift_type, break_minutes, travel_minutes, contract_id,
            address:addresses(label, street, city, client:clients(id, name))
          )
        `)
        .eq("company_id", companyId)
        .gte("tasks.scheduled_date", from)
        .lte("tasks.scheduled_date", to),
      supabase
        .from("vacation_requests")
        .select("*")
        .eq("company_id", companyId)
        .eq("status", "approved"),
      supabase
        .from("employee_absences")
        .select("*")
        .eq("company_id", companyId),
      supabase
        .from("employees")
        .select("id, weekly_hours")
        .eq("company_id", companyId),
    ]);

  const weeklyByEmployee = new Map(
    (employees ?? []).map((e) => [e.id, Number(e.weekly_hours ?? 40)]),
  );

  const base: Omit<ShiftRow, "conflicts">[] = (assignments ?? [])
    .map((a) => {
      const task = Array.isArray(a.task) ? a.task[0] : a.task;
      const emp = Array.isArray(a.employee) ? a.employee[0] : a.employee;
      const addr = task?.address
        ? Array.isArray(task.address)
          ? task.address[0]
          : task.address
        : null;
      const client = addr?.client
        ? Array.isArray(addr.client)
          ? addr.client[0]
          : addr.client
        : null;
      if (!task || !emp) return null;
      return {
        assignmentId: a.id as string,
        taskId: task.id as string,
        employeeId: a.employee_id as string,
        employeeName: emp.full_name as string,
        title: task.title as string,
        scheduledDate: task.scheduled_date as string,
        scheduledStart: task.scheduled_start as string | null,
        scheduledEnd: task.scheduled_end as string | null,
        addressLabel: addr
          ? `${addr.label ?? addr.street}, ${addr.city}`
          : "—",
        clientName: (client as { name?: string; id?: string } | null)?.name ?? "—",
        clientId: (client as { id?: string } | null)?.id ?? null,
        contractId: (task.contract_id as string | null) ?? null,
        shiftType: (task.shift_type as string | null) ?? null,
        breakMinutes: Number(task.break_minutes ?? 0),
        travelMinutes: Number(task.travel_minutes ?? 0),
        status: task.status as string,
      };
    })
    .filter(Boolean) as Omit<ShiftRow, "conflicts">[];

  return base.map((shift) => ({
    ...shift,
    conflicts: detectShiftConflicts(
      shift,
      base,
      (vacations ?? []) as VacationRequestRow[],
      (absences ?? []) as AbsenceRow[],
      weeklyByEmployee.get(shift.employeeId) ?? 40,
    ),
  }));
}

export async function loadTimesheetEntries(companyId: string, from: string, to: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("check_ins")
    .select(`
      id, check_in_at, check_out_at, employee_id,
      employee:employees(full_name),
      task:tasks(title, scheduled_date)
    `)
    .eq("company_id", companyId)
    .gte("check_in_at", `${from}T00:00:00`)
    .lte("check_in_at", `${to}T23:59:59`)
    .not("check_out_at", "is", null)
    .order("check_in_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id as string,
    employeeId: row.employee_id as string,
    employeeName: Array.isArray(row.employee)
      ? row.employee[0]?.full_name ?? "—"
      : row.employee?.full_name ?? "—",
    date: (row.check_in_at as string).slice(0, 10),
    minutes: row.check_out_at
      ? minutesBetween(row.check_in_at as string, row.check_out_at as string)
      : 0,
    taskTitle: Array.isArray(row.task)
      ? row.task[0]?.title ?? "—"
      : row.task?.title ?? "—",
  }));
}

export async function loadEmployeeDocuments(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employee_documents")
    .select("*, employee:employees(full_name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return attachDocumentSignedUrls(data ?? []);
}

export async function loadWorkforceDashboardData(companyId: string) {
  await syncEmployeeAvailabilityStatuses(companyId);
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const supabase = await createClient();
  const [employees, vacations, absences, shifts, { data: todayCheckIns }] = await Promise.all([
    loadWorkforceEmployees(companyId),
    loadVacationRequests(companyId),
    loadAbsences(companyId),
    loadShifts(companyId, weekStart.toISOString().slice(0, 10), weekEnd.toISOString().slice(0, 10)),
    supabase
      .from("check_ins")
      .select("check_in_at, check_out_at")
      .eq("company_id", companyId)
      .gte("check_in_at", `${today}T00:00:00`)
      .lte("check_in_at", `${today}T23:59:59`),
  ]);

  const todayMinutes = (todayCheckIns ?? []).reduce((acc, ci) => {
    if (!ci.check_out_at) return acc;
    return acc + minutesBetween(ci.check_in_at as string, ci.check_out_at as string);
  }, 0);

  const summaries = await loadTimeAccountSummaries(companyId);
  const overtimeMinutes = summaries.reduce((a, s) => a + s.overtimeMinutes, 0);

  return { employees, vacations, absences, shifts, todayMinutes, overtimeMinutes };
}

export async function loadPlanningPageData(companyId: string, from: string, to: string) {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();

  const [
    employees,
    vacations,
    absences,
    shifts,
    summaries,
    { data: todayCheckIns },
  ] = await Promise.all([
    loadWorkforceEmployees(companyId),
    loadVacationRequests(companyId),
    loadAbsences(companyId),
    loadShifts(companyId, from, to),
    loadTimeAccountSummaries(companyId),
    supabase
      .from("check_ins")
      .select("check_in_at, check_out_at")
      .eq("company_id", companyId)
      .gte("check_in_at", `${today}T00:00:00`)
      .lte("check_in_at", `${today}T23:59:59`),
  ]);

  const { data: unassignedTasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("company_id", companyId)
    .gte("scheduled_date", from)
    .lte("scheduled_date", to)
    .not("status", "eq", "cancelled");

  const assignedTaskIds = new Set(shifts.map((s) => s.taskId));
  const unassigned = (unassignedTasks ?? []).filter((t) => !assignedTaskIds.has(t.id as string)).length;

  const todayMinutes = (todayCheckIns ?? []).reduce((acc, ci) => {
    if (!ci.check_out_at) return acc;
    return acc + minutesBetween(ci.check_in_at as string, ci.check_out_at as string);
  }, 0);

  const weekPlannedMinutes = shifts.reduce((a, s) => {
    if (s.scheduledStart && s.scheduledEnd) {
      return a + minutesBetween(s.scheduledStart, s.scheduledEnd);
    }
    return a + 120;
  }, 0);

  return {
    employees,
    vacations,
    absences,
    shifts,
    summaries,
    todayMinutes,
    weekPlannedMinutes,
    unassignedTasks: unassigned,
  };
}
