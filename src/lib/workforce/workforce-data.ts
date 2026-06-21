export interface WorkforceEmployeeRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  employee_number: string | null;
  member_id: string | null;
  status: string;
  hire_date: string | null;
  job_title: string | null;
  supervisor_id: string | null;
  contract_type: string | null;
  weekly_hours: number | null;
  notes: string | null;
  supervisor?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  team?: { team_id: string; team?: { name: string } | Array<{ name: string }> | null } | null;
}

export interface VacationRequestRow {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  status: string;
  notes: string | null;
  approved_at: string | null;
  employee?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
}

export interface AbsenceRow {
  id: string;
  employee_id: string;
  absence_type: string;
  start_date: string;
  end_date: string;
  notes: string | null;
  employee?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
}

export interface TimeAccountSummary {
  employeeId: string;
  employeeName: string;
  weeklyHours: number;
  sollMinutes: number;
  istMinutes: number;
  balanceMinutes: number;
  overtimeMinutes: number;
}

export interface ShiftRow {
  assignmentId: string;
  taskId: string;
  employeeId: string;
  employeeName: string;
  title: string;
  scheduledDate: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  addressLabel: string;
  clientName: string;
  clientId: string | null;
  contractId: string | null;
  shiftType: string | null;
  breakMinutes: number;
  travelMinutes: number;
  status: string;
  conflicts: string[];
  vehicleId: string | null;
  vehicleName: string | null;
  vehiclePlate: string | null;
  usageId: string | null;
}

export interface WorkforceKpis {
  activeEmployees: number;
  onVacation: number;
  hoursTodayMinutes: number;
  overtimeMinutes: number;
  absencesThisWeek: number;
  shiftsThisWeek: number;
}

export interface WorktimePolicyRow {
  work_start: string;
  work_end: string;
  break_minutes: number;
  max_daily_hours: number;
  max_weekly_hours: number;
  overtime_threshold_hours: number;
}

export function employeeName(
  row: { full_name: string | null } | Array<{ full_name: string | null }> | null | undefined,
): string {
  if (!row) return "—";
  return Array.isArray(row) ? row[0]?.full_name ?? "—" : row.full_name ?? "—";
}

export function minutesBetween(start: string, end: string): number {
  return Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60_000));
}

export function computeWorkforceKpis(
  employees: WorkforceEmployeeRow[],
  vacations: VacationRequestRow[],
  absences: AbsenceRow[],
  todayMinutes: number,
  overtimeMinutes: number,
  weekShifts: number,
): WorkforceKpis {
  const today = new Date().toISOString().slice(0, 10);
  const onVacation = vacations.filter(
    (v) =>
      v.status === "approved" &&
      v.start_date <= today &&
      v.end_date >= today,
  ).length;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const absencesThisWeek = absences.filter(
    (a) => a.start_date <= weekEndStr && a.end_date >= weekStartStr,
  ).length;

  return {
    activeEmployees: employees.filter((e) => e.status === "active").length,
    onVacation,
    hoursTodayMinutes: todayMinutes,
    overtimeMinutes,
    absencesThisWeek,
    shiftsThisWeek: weekShifts,
  };
}

export function detectShiftConflicts(
  shift: Omit<ShiftRow, "conflicts">,
  allShifts: Omit<ShiftRow, "conflicts">[],
  vacations: VacationRequestRow[],
  absences: AbsenceRow[],
  weeklyHours: number,
): string[] {
  const conflicts: string[] = [];
  const date = shift.scheduledDate;

  const onVacation = vacations.some(
    (v) =>
      v.employee_id === shift.employeeId &&
      v.status === "approved" &&
      v.start_date <= date &&
      v.end_date >= date,
  );
  if (onVacation) conflicts.push("vacation");

  const onAbsence = absences.some(
    (a) =>
      a.employee_id === shift.employeeId &&
      a.start_date <= date &&
      a.end_date >= date,
  );
  if (onAbsence) conflicts.push("absence");

  const sameDay = allShifts.filter(
    (s) =>
      s.employeeId === shift.employeeId &&
      s.scheduledDate === date &&
      s.assignmentId !== shift.assignmentId,
  );
  if (sameDay.length >= 3) conflicts.push("overload");

  const weekStart = new Date(date + "T12:00:00");
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const ws = weekStart.toISOString().slice(0, 10);
  const we = weekEnd.toISOString().slice(0, 10);

  const weekShifts = allShifts.filter(
    (s) =>
      s.employeeId === shift.employeeId &&
      s.scheduledDate >= ws &&
      s.scheduledDate <= we,
  );
  const estimatedWeekHours = weekShifts.length * 2;
  if (estimatedWeekHours > weeklyHours) conflicts.push("weekly_hours");

  return conflicts;
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}
