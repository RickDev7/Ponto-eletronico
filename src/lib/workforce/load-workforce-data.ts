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
import {
  buildEmployeeServiceTypeMap,
  type CompanySkillRow,
  type EmployeeAvailabilityRow,
  type EmployeeHistoryEntry,
  type EmployeeSkillRow,
} from "@/lib/workforce/employee-domain";
import { computeEmployeeAvailability } from "@/lib/workforce/planning-data";
import { loadActiveVehicleUsageByTasks, loadAvailableVehicles } from "@/lib/vehicles/load-vehicle-data";

export async function loadWorkforceEmployees(companyId: string): Promise<WorkforceEmployeeRow[]> {
  await syncEmployeeAvailabilityStatuses(companyId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("company_id", companyId)
    .neq("status", "terminated")
    .order("full_name");

  if (error) {
    console.error("[loadWorkforceEmployees]", error.message);
    return [];
  }

  const rows = (data ?? []) as WorkforceEmployeeRow[];
  const supervisorIds = [
    ...new Set(rows.map((e) => e.supervisor_id).filter(Boolean)),
  ] as string[];

  if (supervisorIds.length === 0) return rows;

  const { data: supervisors } = await supabase
    .from("employees")
    .select("id, full_name")
    .eq("company_id", companyId)
    .in("id", supervisorIds);

  const nameById = new Map(
    (supervisors ?? []).map((s) => [s.id as string, s.full_name as string | null]),
  );

  return rows.map((emp) => ({
    ...emp,
    supervisor: emp.supervisor_id
      ? { full_name: nameById.get(emp.supervisor_id) ?? null }
      : null,
  }));
}

export async function loadWorkforceEmployeesHub(companyId: string) {
  await syncEmployeeAvailabilityStatuses(companyId);
  const supabase = await createClient();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const [
    employees,
    teamMembers,
    employeeSkills,
    companySkills,
    teams,
    vacations,
    absences,
    shifts,
    timeSummaries,
  ] = await Promise.all([
    loadWorkforceEmployees(companyId),
    supabase
      .from("team_members")
      .select("employee_id, team_id, team:teams(id, name)")
      .eq("company_id", companyId),
    supabase
      .from("employee_skills")
      .select("employee_id, skill_id, skill:company_skills(id, name)")
      .eq("company_id", companyId),
    loadCompanySkills(companyId),
    supabase.from("teams").select("id, name").eq("company_id", companyId).order("name"),
    loadVacationRequests(companyId),
    loadAbsences(companyId),
    loadShifts(companyId, weekStartStr, weekEndStr),
    loadTimeAccountSummaries(companyId),
  ]);

  const teamByEmployee = new Map<string, { teamId: string; teamName: string }>();
  for (const row of teamMembers.data ?? []) {
    const team = Array.isArray(row.team) ? row.team[0] : row.team;
    if (team?.id && team?.name) {
      teamByEmployee.set(row.employee_id as string, {
        teamId: team.id as string,
        teamName: team.name as string,
      });
    }
  }

  const skillsByEmployee = new Map<string, { ids: string[]; names: string[] }>();
  for (const row of employeeSkills.data ?? []) {
    const skill = Array.isArray(row.skill) ? row.skill[0] : row.skill;
    const current = skillsByEmployee.get(row.employee_id as string) ?? { ids: [], names: [] };
    if (skill?.id && skill?.name) {
      current.ids.push(skill.id as string);
      current.names.push(skill.name as string);
    }
    skillsByEmployee.set(row.employee_id as string, current);
  }

  const timeByEmployee = new Map(
    timeSummaries.map((s) => [s.employeeId, s]),
  );

  const { computeEmployeeAvailability } = await import("@/lib/workforce/planning-data");
  const { parseDepartmentFromNotes } = await import("@/lib/workforce/employees-hub");

  const enriched = employees.map((emp) => {
    const team = teamByEmployee.get(emp.id);
    const skills = skillsByEmployee.get(emp.id) ?? { ids: [], names: [] };
    const time = timeByEmployee.get(emp.id);
    const card = computeEmployeeAvailability(
      emp,
      shifts,
      vacations,
      absences,
      weekStartStr,
      weekEndStr,
      time?.istMinutes ?? 0,
      skills.names,
    );

    return {
      ...emp,
      teamId: team?.teamId ?? null,
      teamName: team?.teamName ?? null,
      department: parseDepartmentFromNotes(emp.notes),
      skillIds: skills.ids,
      skillNames: skills.names,
      availability: card.availability,
      plannedMinutesWeek: card.plannedMinutes,
      workedMinutesWeek: time?.istMinutes ?? 0,
      memberRole: null,
      hasMobileAccess: Boolean(emp.member_id),
    };
  });

  return {
    employees: enriched,
    teams: (teams.data ?? []) as Array<{ id: string; name: string }>,
    skills: companySkills,
    supervisors: employees
      .filter((e) => e.status === "active")
      .map((e) => ({ id: e.id, full_name: e.full_name })),
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

export async function loadEmployeeHistory(
  companyId: string,
  employeeId: string,
  vacations: Array<{ id: string; start_date: string; end_date: string; status: string; created_at?: string }>,
  absences: Array<{ id: string; start_date: string; end_date: string; absence_type: string; created_at?: string }>,
  documents: Array<{ id: string; title: string; doc_type: string; created_at?: string }>,
): Promise<EmployeeHistoryEntry[]> {
  const supabase = await createClient();
  const { data: activityRows } = await supabase
    .from("activity_logs")
    .select("id, action, metadata, created_at")
    .eq("company_id", companyId)
    .eq("entity_type", "employee")
    .eq("entity_id", employeeId)
    .order("created_at", { ascending: false })
    .limit(30);

  const entries: EmployeeHistoryEntry[] = [];

  for (const row of activityRows ?? []) {
    entries.push({
      id: `activity-${row.id}`,
      kind: "activity",
      action: row.action as string,
      label: row.action as string,
      createdAt: row.created_at as string,
      metadata: row.metadata as Record<string, unknown> | null,
    });
  }

  for (const v of vacations) {
    entries.push({
      id: `vacation-${v.id}`,
      kind: "vacation",
      action: v.status,
      label: `${v.start_date} → ${v.end_date}`,
      createdAt: v.created_at ?? v.start_date,
    });
  }

  for (const a of absences) {
    entries.push({
      id: `absence-${a.id}`,
      kind: "absence",
      action: a.absence_type,
      label: `${a.start_date} → ${a.end_date}`,
      createdAt: a.created_at ?? a.start_date,
    });
  }

  for (const d of documents) {
    entries.push({
      id: `document-${d.id}`,
      kind: "document",
      action: "uploaded",
      label: d.title,
      createdAt: d.created_at ?? new Date().toISOString(),
      metadata: { doc_type: d.doc_type },
    });
  }

  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 40);
}

export async function loadEmployeeProfile(companyId: string, employeeId: string) {
  await syncEmployeeAvailabilityStatuses(companyId);
  const supabase = await createClient();

  const [
    { data: employee, error: employeeError },
    { data: teamMember },
    { data: vacations },
    { data: absences },
    { data: timeEntries },
    { data: documents },
    { data: assignments },
    { data: employeeSkills },
  ] = await Promise.all([
    supabase
      .from("employees")
      .select("*")
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
    supabase
      .from("employee_skills")
      .select("employee_id, skill_id, level, certified_at, skill:company_skills(id, name, service_type, color)")
      .eq("employee_id", employeeId)
      .eq("company_id", companyId),
  ]);

  const vacationRows = vacations ?? [];
  const absenceRows = absences ?? [];
  const documentRows = documents ?? [];

  let employeeRow = employee as WorkforceEmployeeRow | null;
  if (employeeError) {
    console.error("[loadEmployeeProfile]", employeeError.message);
    employeeRow = null;
  } else if (employeeRow?.supervisor_id) {
    const { data: supervisor } = await supabase
      .from("employees")
      .select("full_name")
      .eq("id", employeeRow.supervisor_id)
      .eq("company_id", companyId)
      .maybeSingle();
    employeeRow = {
      ...employeeRow,
      supervisor: supervisor ? { full_name: supervisor.full_name } : null,
    };
  }

  return {
    employee: employeeRow ? { ...employeeRow, team: teamMember } : null,
    vacations: vacationRows,
    absences: absenceRows,
    timeEntries: timeEntries ?? [],
    documents: await attachDocumentSignedUrls(documentRows),
    upcomingShifts: assignments ?? [],
    skills: (employeeSkills ?? []) as EmployeeSkillRow[],
    history: await loadEmployeeHistory(companyId, employeeId, vacationRows, absenceRows, documentRows),
  };
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
    vehicleId: null,
    vehicleName: null,
    vehiclePlate: null,
    usageId: null,
    conflicts: detectShiftConflicts(
      shift,
      base,
      (vacations ?? []) as VacationRequestRow[],
      (absences ?? []) as AbsenceRow[],
      weeklyByEmployee.get(shift.employeeId) ?? 40,
    ),
  }));
}

async function attachVehicleDataToShifts(
  companyId: string,
  shifts: ShiftRow[],
): Promise<ShiftRow[]> {
  const taskIds = shifts.map((s) => s.taskId);
  const usageByTask = await loadActiveVehicleUsageByTasks(companyId, taskIds);

  return shifts.map((shift) => {
    const usage = usageByTask.get(shift.taskId);
    if (!usage) return shift;
    return {
      ...shift,
      vehicleId: usage.vehicleId,
      vehicleName: usage.vehicleName,
      vehiclePlate: usage.vehiclePlate,
      usageId: usage.usageId,
    };
  });
}

export async function loadShiftsWithVehicles(
  companyId: string,
  from: string,
  to: string,
): Promise<ShiftRow[]> {
  const shifts = await loadShifts(companyId, from, to);
  return attachVehicleDataToShifts(companyId, shifts);
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

  return (data ?? []).map((row) => {
    const employee = row.employee as { full_name?: string } | Array<{ full_name?: string }> | null;
    const task = row.task as { title?: string } | Array<{ title?: string }> | null;
    return {
      id: row.id as string,
      employeeId: row.employee_id as string,
      employeeName: Array.isArray(employee)
        ? employee[0]?.full_name ?? "—"
        : employee?.full_name ?? "—",
      date: (row.check_in_at as string).slice(0, 10),
      minutes: row.check_out_at
        ? minutesBetween(row.check_in_at as string, row.check_out_at as string)
        : 0,
      taskTitle: Array.isArray(task)
        ? task[0]?.title ?? "—"
        : task?.title ?? "—",
    };
  });
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

export async function loadCompanySkills(companyId: string): Promise<CompanySkillRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_skills")
    .select("*")
    .eq("company_id", companyId)
    .order("name");
  return (data ?? []) as CompanySkillRow[];
}

export async function loadEmployeeSkillsForCompany(companyId: string): Promise<EmployeeSkillRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employee_skills")
    .select("employee_id, skill_id, level, certified_at, company_id, skill:company_skills(id, name, service_type, color)")
    .eq("company_id", companyId);
  return (data ?? []) as EmployeeSkillRow[];
}

export function groupSkillsByEmployee(rows: EmployeeSkillRow[]): Map<string, EmployeeSkillRow[]> {
  const map = new Map<string, EmployeeSkillRow[]>();
  for (const row of rows) {
    const list = map.get(row.employee_id) ?? [];
    list.push(row);
    map.set(row.employee_id, list);
  }
  return map;
}

export async function loadAvailabilityOverview(
  companyId: string,
  from: string,
  to: string,
): Promise<EmployeeAvailabilityRow[]> {
  const [employees, vacations, absences, shifts, summaries, skillRows] = await Promise.all([
    loadWorkforceEmployees(companyId),
    loadVacationRequests(companyId),
    loadAbsences(companyId),
    loadShifts(companyId, from, to),
    loadTimeAccountSummaries(companyId),
    loadEmployeeSkillsForCompany(companyId),
  ]);

  const skillsByEmployee = groupSkillsByEmployee(skillRows);

  return employees.map((emp) => {
    const summary = summaries.find((s) => s.employeeId === emp.id);
    const card = computeEmployeeAvailability(
      emp,
      shifts,
      vacations,
      absences,
      from,
      to,
      summary?.istMinutes ?? 0,
      (skillsByEmployee.get(emp.id) ?? []).map((s) => {
        const skill = Array.isArray(s.skill) ? s.skill[0] : s.skill;
        return skill?.name ?? "";
      }).filter(Boolean),
      (skillsByEmployee.get(emp.id) ?? []).flatMap((s) => {
        const skill = Array.isArray(s.skill) ? s.skill[0] : s.skill;
        return skill?.service_type ? [skill.service_type] : [];
      }),
    );
    return {
      employeeId: emp.id,
      fullName: emp.full_name,
      jobTitle: emp.job_title,
      status: emp.status,
      availability: card.availability,
      workloadPct: card.workloadPct,
      plannedMinutes: card.plannedMinutes,
      contractMinutes: card.contractMinutes,
      onVacationToday: card.onVacationToday,
      onSickToday: card.onSickToday,
      skillCount: skillsByEmployee.get(emp.id)?.length ?? 0,
    };
  });
}

export async function loadPlanningPageData(companyId: string, from: string, to: string) {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();

  const [
    employees,
    vacations,
    absences,
    shiftsRaw,
    summaries,
    skillRows,
    vehicles,
    { data: todayCheckIns },
  ] = await Promise.all([
    loadWorkforceEmployees(companyId),
    loadVacationRequests(companyId),
    loadAbsences(companyId),
    loadShifts(companyId, from, to),
    loadTimeAccountSummaries(companyId),
    loadEmployeeSkillsForCompany(companyId),
    loadAvailableVehicles(companyId),
    supabase
      .from("check_ins")
      .select("check_in_at, check_out_at")
      .eq("company_id", companyId)
      .gte("check_in_at", `${today}T00:00:00`)
      .lte("check_in_at", `${today}T23:59:59`),
  ]);

  const shifts = await attachVehicleDataToShifts(companyId, shiftsRaw);

  const { data: unassignedTaskRows } = await supabase
    .from("tasks")
    .select("id, title, scheduled_date, status, service_type")
    .eq("company_id", companyId)
    .gte("scheduled_date", from)
    .lte("scheduled_date", to)
    .not("status", "eq", "cancelled");

  const assignedTaskIds = new Set(shifts.map((s) => s.taskId));
  const unassignedList = (unassignedTaskRows ?? []).filter(
    (t) => !assignedTaskIds.has(t.id as string),
  );
  const unassigned = unassignedList.length;

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

  const skillsByEmployee = groupSkillsByEmployee(skillRows);
  const employeeServiceTypes = buildEmployeeServiceTypeMap(skillRows);

  return {
    employees,
    vacations,
    absences,
    shifts,
    summaries,
    skillsByEmployee,
    employeeServiceTypes,
    employeeSkillRows: skillRows,
    todayMinutes,
    weekPlannedMinutes,
    unassignedTasks: unassigned,
    unassignedTaskList: unassignedList.map((t) => ({
      id: t.id as string,
      title: t.title as string,
      scheduled_date: t.scheduled_date as string,
      service_type: (t.service_type as string | null) ?? null,
    })),
    vehicles,
  };
}
