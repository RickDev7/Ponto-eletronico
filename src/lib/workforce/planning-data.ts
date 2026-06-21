import {
  detectShiftConflicts,
  formatMinutes,
  minutesBetween,
  type AbsenceRow,
  type ShiftRow,
  type TimeAccountSummary,
  type VacationRequestRow,
  type WorkforceEmployeeRow,
} from "@/lib/workforce/workforce-data";

export type AvailabilityStatus = "available" | "limited" | "overbooked" | "unavailable";

export interface PlanningKpis {
  scheduledToday: number;
  openShifts: number;
  missingEmployees: number;
  onVacation: number;
  onSickLeave: number;
  unassignedTasks: number;
  plannedHoursMinutes: number;
  actualHoursMinutes: number;
  utilizationPct: number;
}

export interface EmployeePlanningCard {
  id: string;
  fullName: string;
  jobTitle: string | null;
  weeklyHours: number;
  contractMinutes: number;
  plannedMinutes: number;
  actualMinutes: number;
  workloadPct: number;
  availability: AvailabilityStatus;
  status: string;
  shiftCount: number;
  vacationDays: number;
  sickDays: number;
  onVacationToday: boolean;
  onSickToday: boolean;
  skills: string[];
  serviceTypes: string[];
}

export interface AutoPlanAssignment {
  taskId: string;
  employeeId: string;
  scheduledDate: string;
  title: string;
}

export interface PlanningRecommendation {
  id: string;
  type: "move" | "fill" | "warning" | "availability";
  priority: "high" | "medium" | "low";
  messageKey: string;
  messageParams: Record<string, string>;
  assignmentId?: string;
  targetEmployeeId?: string;
  targetDate?: string;
}

export interface OptimizeWeekResult {
  recommendations: PlanningRecommendation[];
  moves: Array<{ assignmentId: string; employeeId: string; scheduledDate: string }>;
}

export interface MonthlyPlanningSummary {
  plannedMinutes: number;
  workedMinutes: number;
  employeeCount: number;
  avgUtilizationPct: number;
}

function weekBounds(dateStr: string): { start: string; end: string } {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const start = d.toISOString().slice(0, 10);
  const endDate = new Date(d);
  endDate.setDate(endDate.getDate() + 6);
  return { start, end: endDate.toISOString().slice(0, 10) };
}

function daysBetweenInclusive(start: string, end: string): number {
  const a = new Date(start + "T12:00:00");
  const b = new Date(end + "T12:00:00");
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1);
}

function overlapDays(
  rangeStart: string,
  rangeEnd: string,
  blockStart: string,
  blockEnd: string,
): number {
  const start = rangeStart > blockStart ? rangeStart : blockStart;
  const end = rangeEnd < blockEnd ? rangeEnd : blockEnd;
  if (start > end) return 0;
  return daysBetweenInclusive(start, end);
}

export function isEmployeeBlockedOnDate(
  employeeId: string,
  date: string,
  vacations: VacationRequestRow[],
  absences: AbsenceRow[],
): "vacation" | "sick" | "absence" | null {
  if (
    vacations.some(
      (v) =>
        v.employee_id === employeeId &&
        v.status === "approved" &&
        v.start_date <= date &&
        v.end_date >= date,
    )
  ) {
    return "vacation";
  }
  const dayAbsence = absences.find(
    (a) => a.employee_id === employeeId && a.start_date <= date && a.end_date >= date,
  );
  if (!dayAbsence) return null;
  return dayAbsence.absence_type === "sick" ? "sick" : "absence";
}

export function shiftDurationMinutes(shift: ShiftRow): number {
  if (shift.scheduledStart && shift.scheduledEnd) {
    return minutesBetween(shift.scheduledStart, shift.scheduledEnd);
  }
  return 120 + (shift.breakMinutes ?? 0) + (shift.travelMinutes ?? 0);
}

export function computePlanningKpis(params: {
  today: string;
  shifts: ShiftRow[];
  employees: WorkforceEmployeeRow[];
  vacations: VacationRequestRow[];
  absences: AbsenceRow[];
  unassignedTasks: number;
  todayActualMinutes: number;
  weekPlannedMinutes: number;
}): PlanningKpis {
  const { today, shifts, employees, vacations, absences, unassignedTasks, todayActualMinutes, weekPlannedMinutes } =
    params;

  const todayShifts = shifts.filter((s) => s.scheduledDate === today);
  const scheduledEmployeeIds = new Set(todayShifts.map((s) => s.employeeId));
  const activeEmployees = employees.filter((e) => e.status === "active" || e.status === "on_vacation");

  const onVacation = vacations.filter(
    (v) => v.status === "approved" && v.start_date <= today && v.end_date >= today,
  ).length;

  const onSickLeave = absences.filter(
    (a) =>
      a.absence_type === "sick" &&
      a.start_date <= today &&
      a.end_date >= today,
  ).length;

  const openShifts = shifts.filter((s) => s.conflicts.includes("overload") || s.conflicts.length === 0).length;
  const missingEmployees = Math.max(
    0,
    activeEmployees.filter((e) => e.status === "active").length - scheduledEmployeeIds.size,
  );

  const plannedTodayMinutes = todayShifts.reduce((a, s) => a + shiftDurationMinutes(s), 0);
  const totalWeeklyCapacity = activeEmployees.reduce((a, e) => a + Number(e.weekly_hours ?? 40) * 60, 0);
  const utilizationPct =
    totalWeeklyCapacity > 0 ? Math.round((weekPlannedMinutes / totalWeeklyCapacity) * 100) : 0;

  return {
    scheduledToday: scheduledEmployeeIds.size,
    openShifts,
    missingEmployees,
    onVacation,
    onSickLeave,
    unassignedTasks,
    plannedHoursMinutes: plannedTodayMinutes,
    actualHoursMinutes: todayActualMinutes,
    utilizationPct,
  };
}

export function computeEmployeeAvailability(
  employee: WorkforceEmployeeRow,
  shifts: ShiftRow[],
  vacations: VacationRequestRow[],
  absences: AbsenceRow[],
  rangeStart: string,
  rangeEnd: string,
  actualMinutes: number,
  skillNames: string[] = [],
  serviceTypes: string[] = [],
): EmployeePlanningCard {
  const empShifts = shifts.filter((s) => s.employeeId === employee.id);
  const weeklyHours = Number(employee.weekly_hours ?? 40);
  const rangeDays = daysBetweenInclusive(rangeStart, rangeEnd);
  const contractMinutes = Math.round((weeklyHours * 60 * rangeDays) / 7);
  const plannedMinutes = empShifts.reduce((a, s) => a + shiftDurationMinutes(s), 0);
  const workloadPct =
    contractMinutes > 0 ? Math.min(150, Math.round((plannedMinutes / contractMinutes) * 100)) : 0;

  const today = new Date().toISOString().slice(0, 10);
  const onVacationToday = isEmployeeBlockedOnDate(employee.id, today, vacations, absences) === "vacation";
  const onSickToday = isEmployeeBlockedOnDate(employee.id, today, vacations, absences) === "sick";

  const vacationDays = vacations
    .filter((v) => v.employee_id === employee.id && v.status === "approved")
    .reduce((acc, v) => acc + overlapDays(rangeStart, rangeEnd, v.start_date, v.end_date), 0);

  const sickDays = absences
    .filter((a) => a.employee_id === employee.id && a.absence_type === "sick")
    .reduce((acc, a) => acc + overlapDays(rangeStart, rangeEnd, a.start_date, a.end_date), 0);

  let availability: AvailabilityStatus = "available";

  if (
    employee.status === "on_vacation" ||
    employee.status === "absent" ||
    employee.status === "inactive" ||
    onVacationToday ||
    onSickToday
  ) {
    availability = "unavailable";
  } else if (empShifts.some((s) => s.conflicts.includes("overload") || s.conflicts.includes("weekly_hours"))) {
    availability = "overbooked";
  } else if (
    empShifts.some((s) => s.conflicts.length > 0) ||
    workloadPct > 85
  ) {
    availability = "limited";
  }

  return {
    id: employee.id,
    fullName: employee.full_name,
    jobTitle: employee.job_title,
    weeklyHours,
    contractMinutes,
    plannedMinutes,
    actualMinutes,
    workloadPct,
    availability,
    status: employee.status,
    shiftCount: empShifts.length,
    vacationDays,
    sickDays,
    onVacationToday,
    onSickToday,
    skills: skillNames,
    serviceTypes,
  };
}

export function computeWorkloadRecommendations(
  shifts: ShiftRow[],
  employees: WorkforceEmployeeRow[],
  cards: EmployeePlanningCard[],
): PlanningRecommendation[] {
  const recs: PlanningRecommendation[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const { start, end } = weekBounds(today);

  for (const shift of shifts.filter((s) => s.conflicts.length > 0)) {
    if (shift.conflicts.includes("vacation") || shift.conflicts.includes("absence")) {
      const available = cards.find(
        (c) =>
          c.availability === "available" &&
          c.id !== shift.employeeId &&
          !shifts.some((s) => s.employeeId === c.id && s.scheduledDate === shift.scheduledDate),
      );
      if (available) {
        recs.push({
          id: `move-${shift.assignmentId}`,
          type: "move",
          priority: "high",
          messageKey: "recs.moveEmployee",
          messageParams: {
            from: shift.employeeName,
            to: available.fullName,
            location: shift.addressLabel,
          },
          assignmentId: shift.assignmentId,
          targetEmployeeId: available.id,
          targetDate: shift.scheduledDate,
        });
      }
    }
    if (shift.conflicts.includes("weekly_hours")) {
      recs.push({
        id: `warn-${shift.assignmentId}`,
        type: "warning",
        priority: "high",
        messageKey: "recs.overtimeRisk",
        messageParams: { name: shift.employeeName },
        assignmentId: shift.assignmentId,
      });
    }
  }

  const understaffedDates = new Map<string, number>();
  for (const shift of shifts) {
    if (shift.scheduledDate >= start && shift.scheduledDate <= end) {
      understaffedDates.set(shift.scheduledDate, (understaffedDates.get(shift.scheduledDate) ?? 0) + 1);
    }
  }

  const activeCount = employees.filter((e) => e.status === "active").length;
  for (const [date, count] of understaffedDates) {
    if (count < Math.ceil(activeCount * 0.3)) {
      const free = cards.filter(
        (c) =>
          c.availability === "available" &&
          !shifts.some((s) => s.employeeId === c.id && s.scheduledDate === date),
      );
      if (free[0]) {
        recs.push({
          id: `fill-${date}`,
          type: "fill",
          priority: "medium",
          messageKey: "recs.understaffed",
          messageParams: { date, name: free[0].fullName },
          targetEmployeeId: free[0].id,
          targetDate: date,
        });
      }
    }
  }

  for (const card of cards.filter((c) => c.availability === "available" && c.shiftCount === 0)) {
    recs.push({
      id: `avail-${card.id}`,
      type: "availability",
      priority: "low",
      messageKey: "recs.available",
      messageParams: { name: card.fullName },
      targetEmployeeId: card.id,
    });
  }

  return recs.slice(0, 12);
}

export function optimizeWeekPlan(
  shifts: ShiftRow[],
  employees: WorkforceEmployeeRow[],
  cards: EmployeePlanningCard[],
): OptimizeWeekResult {
  const recommendations = computeWorkloadRecommendations(shifts, employees, cards);
  const moves = recommendations
    .filter((r) => r.type === "move" && r.assignmentId && r.targetEmployeeId && r.targetDate)
    .map((r) => ({
      assignmentId: r.assignmentId!,
      employeeId: r.targetEmployeeId!,
      scheduledDate: r.targetDate!,
    }));

  return { recommendations, moves };
}

export function computeAutoPlanAssignments(
  unassignedTasks: Array<{ id: string; scheduled_date: string; title: string; service_type?: string | null }>,
  employees: WorkforceEmployeeRow[],
  cards: EmployeePlanningCard[],
  shifts: ShiftRow[],
  vacations: VacationRequestRow[],
  absences: AbsenceRow[],
): AutoPlanAssignment[] {
  const assignments: AutoPlanAssignment[] = [];
  const plannedByEmployeeDate = new Map<string, number>();

  for (const shift of shifts) {
    const key = `${shift.employeeId}:${shift.scheduledDate}`;
    plannedByEmployeeDate.set(key, (plannedByEmployeeDate.get(key) ?? 0) + 1);
  }

  const sortedTasks = [...unassignedTasks].sort((a, b) =>
    a.scheduled_date.localeCompare(b.scheduled_date),
  );

  for (const task of sortedTasks) {
    const candidates = employees
      .filter((e) => e.status === "active")
      .map((emp) => {
        const card = cards.find((c) => c.id === emp.id);
        const blocked = isEmployeeBlockedOnDate(emp.id, task.scheduled_date, vacations, absences);
        const dayShifts = plannedByEmployeeDate.get(`${emp.id}:${task.scheduled_date}`) ?? 0;
        return {
          emp,
          card,
          blocked,
          dayShifts,
          workload: card?.workloadPct ?? 0,
        };
      })
      .filter((c) => !c.blocked && c.dayShifts < 3)
      .sort((a, b) => {
        const taskType = task.service_type ?? null;
        const aSkill = taskType && a.card?.serviceTypes.includes(taskType) ? 0 : 1;
        const bSkill = taskType && b.card?.serviceTypes.includes(taskType) ? 0 : 1;
        return aSkill - bSkill || a.workload - b.workload || a.dayShifts - b.dayShifts;
      });

    const pick = candidates[0];
    if (!pick) continue;

    assignments.push({
      taskId: task.id,
      employeeId: pick.emp.id,
      scheduledDate: task.scheduled_date,
      title: task.title,
    });

    const key = `${pick.emp.id}:${task.scheduled_date}`;
    plannedByEmployeeDate.set(key, (plannedByEmployeeDate.get(key) ?? 0) + 1);
  }

  return assignments;
}

export function computeMonthlySummary(
  shifts: ShiftRow[],
  summaries: TimeAccountSummary[],
): MonthlyPlanningSummary {
  const plannedMinutes = shifts.reduce((a, s) => a + shiftDurationMinutes(s), 0);
  const workedMinutes = summaries.reduce((a, s) => a + s.istMinutes, 0);
  const avgUtilizationPct =
    summaries.length > 0
      ? Math.round(
          summaries.reduce((a, s) => {
            const cap = s.weeklyHours * 60 * 4.33;
            return a + (cap > 0 ? (s.istMinutes / cap) * 100 : 0);
          }, 0) / summaries.length,
        )
      : 0;

  return {
    plannedMinutes,
    workedMinutes,
    employeeCount: summaries.length,
    avgUtilizationPct,
  };
}

export { formatMinutes };
