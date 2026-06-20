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
  plannedMinutes: number;
  actualMinutes: number;
  availability: AvailabilityStatus;
  status: string;
  shiftCount: number;
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
): EmployeePlanningCard {
  const empShifts = shifts.filter((s) => s.employeeId === employee.id);
  const weeklyHours = Number(employee.weekly_hours ?? 40);
  const plannedMinutes = empShifts.reduce((a, s) => a + shiftDurationMinutes(s), 0);
  const capacityMinutes = weeklyHours * 60;

  let availability: AvailabilityStatus = "available";

  if (employee.status === "on_vacation" || employee.status === "absent" || employee.status === "inactive") {
    availability = "unavailable";
  } else if (empShifts.some((s) => s.conflicts.includes("overload") || s.conflicts.includes("weekly_hours"))) {
    availability = "overbooked";
  } else if (
    empShifts.some((s) => s.conflicts.length > 0) ||
    plannedMinutes > capacityMinutes * 0.85
  ) {
    availability = "limited";
  }

  const today = new Date().toISOString().slice(0, 10);
  if (today >= rangeStart && today <= rangeEnd) {
    void vacations;
    void absences;
  }

  return {
    id: employee.id,
    fullName: employee.full_name,
    jobTitle: employee.job_title,
    weeklyHours,
    plannedMinutes,
    actualMinutes,
    availability,
    status: employee.status,
    shiftCount: empShifts.length,
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
