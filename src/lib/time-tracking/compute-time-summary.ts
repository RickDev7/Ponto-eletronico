import type { WorktimePolicyRow, ShiftRow } from "@/lib/workforce/workforce-data";
import { minutesBetween } from "@/lib/workforce/workforce-data";
import { shiftDurationMinutes } from "@/lib/workforce/planning-data";

export type TimeReportGranularity = "daily" | "weekly" | "monthly";

export interface CheckInTimeRow {
  id: string;
  employeeId: string;
  taskId: string;
  checkInAt: string;
  checkOutAt: string;
  breakMinutesActual: number;
  travelMinutesActual: number;
  taskBreakMinutes: number;
  taskTravelMinutes: number;
}

export interface EmployeeTimeDayRow {
  employeeId: string;
  employeeName: string;
  employeeNumber: string | null;
  date: string;
  plannedMinutes: number;
  workedMinutes: number;
  breakMinutes: number;
  travelMinutes: number;
  netWorkedMinutes: number;
  overtimeMinutes: number;
  balanceMinutes: number;
  checkInCount: number;
}

export interface EmployeeTimePeriodRow {
  employeeId: string;
  employeeName: string;
  employeeNumber: string | null;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  plannedMinutes: number;
  workedMinutes: number;
  breakMinutes: number;
  travelMinutes: number;
  netWorkedMinutes: number;
  overtimeMinutes: number;
  balanceMinutes: number;
  payableMinutes: number;
  daysWorked: number;
}

export interface TimeTrackingKpis {
  plannedMinutes: number;
  workedMinutes: number;
  breakMinutes: number;
  travelMinutes: number;
  netWorkedMinutes: number;
  overtimeMinutes: number;
  employeeCount: number;
}

export interface TimeTrackingReport {
  granularity: TimeReportGranularity;
  from: string;
  to: string;
  kpis: TimeTrackingKpis;
  rows: EmployeeTimePeriodRow[];
  dailyRows: EmployeeTimeDayRow[];
}

export function dailyContractMinutes(weeklyHours: number): number {
  return Math.round((weeklyHours / 5) * 60);
}

export function policyOvertimeThresholdMinutes(policy: WorktimePolicyRow | null): number {
  return Math.round(Number(policy?.overtime_threshold_hours ?? 8) * 60);
}

export function resolveBreakMinutes(
  workedMinutes: number,
  actual: number,
  planned: number,
  policy: WorktimePolicyRow | null,
): number {
  if (actual > 0) return actual;
  if (planned > 0) return planned;
  const policyBreak = policy?.break_minutes ?? 0;
  if (workedMinutes >= 360) return policyBreak;
  if (workedMinutes >= 540) return Math.max(policyBreak, 45);
  return 0;
}

export function resolveTravelMinutes(actual: number, planned: number): number {
  return actual > 0 ? actual : planned;
}

export function computeCheckInWorkedMinutes(checkInAt: string, checkOutAt: string): number {
  return minutesBetween(checkInAt, checkOutAt);
}

export function computeNetWorkedMinutes(workedMinutes: number, breakMinutes: number): number {
  return Math.max(0, workedMinutes - breakMinutes);
}

export function computeOvertimeMinutes(
  netWorkedMinutes: number,
  plannedMinutes: number,
  contractDailyMinutes: number,
  thresholdMinutes: number,
): number {
  const vsThreshold = Math.max(0, netWorkedMinutes - thresholdMinutes);
  const vsContract = Math.max(0, netWorkedMinutes - contractDailyMinutes);
  const vsPlanned = Math.max(0, netWorkedMinutes - plannedMinutes);
  return Math.max(vsThreshold, vsContract, vsPlanned);
}

export function computePayableMinutes(netWorkedMinutes: number, travelMinutes: number): number {
  return netWorkedMinutes + travelMinutes;
}

export function plannedMinutesForDay(
  employeeId: string,
  date: string,
  shifts: ShiftRow[],
): number {
  return shifts
    .filter((s) => s.employeeId === employeeId && s.scheduledDate === date)
    .reduce((sum, s) => sum + shiftDurationMinutes(s), 0);
}

export function buildEmployeeDayRow(params: {
  employeeId: string;
  employeeName: string;
  employeeNumber: string | null;
  date: string;
  weeklyHours: number;
  checkIns: CheckInTimeRow[];
  plannedMinutes: number;
  policy: WorktimePolicyRow | null;
}): EmployeeTimeDayRow {
  const { employeeId, employeeName, employeeNumber, date, weeklyHours, checkIns, plannedMinutes, policy } =
    params;

  const workedMinutes = checkIns.reduce(
    (sum, ci) => sum + computeCheckInWorkedMinutes(ci.checkInAt, ci.checkOutAt),
    0,
  );

  const breakMinutes = checkIns.reduce((sum, ci) => {
    const gross = computeCheckInWorkedMinutes(ci.checkInAt, ci.checkOutAt);
    return (
      sum +
      resolveBreakMinutes(
        gross,
        ci.breakMinutesActual,
        ci.taskBreakMinutes,
        policy,
      )
    );
  }, 0);

  const travelMinutes = checkIns.reduce(
    (sum, ci) => sum + resolveTravelMinutes(ci.travelMinutesActual, ci.taskTravelMinutes),
    0,
  );

  const netWorkedMinutes = computeNetWorkedMinutes(workedMinutes, breakMinutes);
  const contractDaily = dailyContractMinutes(weeklyHours);
  const planned = plannedMinutes > 0 ? plannedMinutes : contractDaily;
  const overtimeMinutes = computeOvertimeMinutes(
    netWorkedMinutes,
    planned,
    contractDaily,
    policyOvertimeThresholdMinutes(policy),
  );
  const balanceMinutes = netWorkedMinutes - planned;

  return {
    employeeId,
    employeeName,
    employeeNumber,
    date,
    plannedMinutes: planned,
    workedMinutes,
    breakMinutes,
    travelMinutes,
    netWorkedMinutes,
    overtimeMinutes,
    balanceMinutes,
    checkInCount: checkIns.length,
  };
}

export function aggregateDailyToPeriod(
  dailyRows: EmployeeTimeDayRow[],
  granularity: TimeReportGranularity,
  locale: string,
): EmployeeTimePeriodRow[] {
  const buckets = new Map<string, EmployeeTimeDayRow[]>();

  for (const row of dailyRows) {
    const key =
      granularity === "daily"
        ? `${row.employeeId}:${row.date}`
        : granularity === "weekly"
          ? `${row.employeeId}:${weekStart(row.date)}`
          : `${row.employeeId}:${row.date.slice(0, 7)}`;

    const list = buckets.get(key) ?? [];
    list.push(row);
    buckets.set(key, list);
  }

  return [...buckets.entries()].map(([, rows]) => {
    const first = rows[0]!;
    const periodStart =
      granularity === "daily"
        ? first.date
        : granularity === "weekly"
          ? weekStart(first.date)
          : `${first.date.slice(0, 7)}-01`;
    const periodEnd =
      granularity === "daily"
        ? first.date
        : granularity === "weekly"
          ? weekEnd(weekStart(first.date))
          : monthEnd(first.date.slice(0, 7));

    const plannedMinutes = rows.reduce((a, r) => a + r.plannedMinutes, 0);
    const workedMinutes = rows.reduce((a, r) => a + r.workedMinutes, 0);
    const breakMinutes = rows.reduce((a, r) => a + r.breakMinutes, 0);
    const travelMinutes = rows.reduce((a, r) => a + r.travelMinutes, 0);
    const netWorkedMinutes = rows.reduce((a, r) => a + r.netWorkedMinutes, 0);
    const overtimeMinutes = rows.reduce((a, r) => a + r.overtimeMinutes, 0);
    const balanceMinutes = rows.reduce((a, r) => a + r.balanceMinutes, 0);

    return {
      employeeId: first.employeeId,
      employeeName: first.employeeName,
      employeeNumber: first.employeeNumber,
      periodLabel: formatPeriodLabel(granularity, periodStart, periodEnd, locale),
      periodStart,
      periodEnd,
      plannedMinutes,
      workedMinutes,
      breakMinutes,
      travelMinutes,
      netWorkedMinutes,
      overtimeMinutes,
      balanceMinutes,
      payableMinutes: computePayableMinutes(netWorkedMinutes, travelMinutes),
      daysWorked: rows.filter((r) => r.checkInCount > 0).length,
    };
  }).sort((a, b) => a.employeeName.localeCompare(b.employeeName) || a.periodStart.localeCompare(b.periodStart));
}

export function computeReportKpis(rows: EmployeeTimePeriodRow[]): TimeTrackingKpis {
  return {
    plannedMinutes: rows.reduce((a, r) => a + r.plannedMinutes, 0),
    workedMinutes: rows.reduce((a, r) => a + r.workedMinutes, 0),
    breakMinutes: rows.reduce((a, r) => a + r.breakMinutes, 0),
    travelMinutes: rows.reduce((a, r) => a + r.travelMinutes, 0),
    netWorkedMinutes: rows.reduce((a, r) => a + r.netWorkedMinutes, 0),
    overtimeMinutes: rows.reduce((a, r) => a + r.overtimeMinutes, 0),
    employeeCount: new Set(rows.map((r) => r.employeeId)).size,
  };
}

function weekStart(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function weekEnd(weekStartStr: string): string {
  const d = new Date(weekStartStr + "T12:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

function monthEnd(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(y!, m!, 0);
  return d.toISOString().slice(0, 10);
}

function formatPeriodLabel(
  granularity: TimeReportGranularity,
  start: string,
  end: string,
  locale: string,
): string {
  const loc = locale === "en" ? "en-US" : "pt-BR";
  if (granularity === "daily") {
    return new Date(start + "T12:00:00").toLocaleDateString(loc, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  if (granularity === "weekly") {
    return `${new Date(start + "T12:00:00").toLocaleDateString(loc, { day: "2-digit", month: "short" })} – ${new Date(end + "T12:00:00").toLocaleDateString(loc, { day: "2-digit", month: "short", year: "numeric" })}`;
  }
  return new Date(start + "T12:00:00").toLocaleDateString(loc, { month: "long", year: "numeric" });
}

export function periodBounds(
  granularity: TimeReportGranularity,
  anchor: string,
): { from: string; to: string } {
  if (granularity === "daily") {
    return { from: anchor, to: anchor };
  }
  if (granularity === "weekly") {
    const start = weekStart(anchor);
    return { from: start, to: weekEnd(start) };
  }
  const ym = anchor.slice(0, 7);
  return { from: `${ym}-01`, to: monthEnd(ym) };
}
