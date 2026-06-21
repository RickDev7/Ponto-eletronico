import { createClient } from "@/lib/supabase/server";
import { loadShifts, loadWorktimePolicy } from "@/lib/workforce/load-workforce-data";
import {
  aggregateDailyToPeriod,
  buildEmployeeDayRow,
  computeReportKpis,
  periodBounds,
  plannedMinutesForDay,
  type CheckInTimeRow,
  type TimeReportGranularity,
  type TimeTrackingReport,
} from "@/lib/time-tracking/compute-time-summary";

function parseCheckInRow(row: Record<string, unknown>): CheckInTimeRow | null {
  if (!row.check_out_at) return null;
  const task = Array.isArray(row.task) ? row.task[0] : row.task;
  return {
    id: row.id as string,
    employeeId: row.employee_id as string,
    taskId: row.task_id as string,
    checkInAt: row.check_in_at as string,
    checkOutAt: row.check_out_at as string,
    breakMinutesActual: Number(row.break_minutes_actual ?? 0),
    travelMinutesActual: Number(row.travel_minutes_actual ?? 0),
    taskBreakMinutes: Number((task as { break_minutes?: number } | null)?.break_minutes ?? 0),
    taskTravelMinutes: Number((task as { travel_minutes?: number } | null)?.travel_minutes ?? 0),
  };
}

export async function loadTimeTrackingReport(
  companyId: string,
  granularity: TimeReportGranularity,
  anchorDate: string,
  locale: string,
): Promise<TimeTrackingReport> {
  const { from, to } = periodBounds(granularity, anchorDate);
  const supabase = await createClient();

  const [{ data: employees }, { data: checkIns }, shifts, policy] = await Promise.all([
    supabase
      .from("employees")
      .select("id, full_name, employee_number, weekly_hours")
      .eq("company_id", companyId)
      .neq("status", "terminated"),
    supabase
      .from("check_ins")
      .select(`
        id, employee_id, task_id, check_in_at, check_out_at,
        break_minutes_actual, travel_minutes_actual,
        task:tasks(break_minutes, travel_minutes)
      `)
      .eq("company_id", companyId)
      .gte("check_in_at", `${from}T00:00:00`)
      .lte("check_in_at", `${to}T23:59:59`)
      .not("check_out_at", "is", null),
    loadShifts(companyId, from, to),
    loadWorktimePolicy(companyId),
  ]);

  const employeeMap = new Map(
    (employees ?? []).map((e) => [
      e.id as string,
      {
        name: e.full_name as string,
        number: (e.employee_number as string | null) ?? null,
        weeklyHours: Number(e.weekly_hours ?? 40),
      },
    ]),
  );

  const checkInsByEmployeeDate = new Map<string, CheckInTimeRow[]>();
  for (const row of checkIns ?? []) {
    const parsed = parseCheckInRow(row as Record<string, unknown>);
    if (!parsed) continue;
    const date = parsed.checkInAt.slice(0, 10);
    const key = `${parsed.employeeId}:${date}`;
    const list = checkInsByEmployeeDate.get(key) ?? [];
    list.push(parsed);
    checkInsByEmployeeDate.set(key, list);
  }

  const dailyRows: ReturnType<typeof buildEmployeeDayRow>[] = [];
  const dates = enumerateDates(from, to);

  for (const [employeeId, meta] of employeeMap) {
    for (const date of dates) {
      const key = `${employeeId}:${date}`;
      const dayCheckIns = checkInsByEmployeeDate.get(key) ?? [];
      const planned = plannedMinutesForDay(employeeId, date, shifts);

      if (dayCheckIns.length === 0 && planned === 0) continue;

      dailyRows.push(
        buildEmployeeDayRow({
          employeeId,
          employeeName: meta.name,
          employeeNumber: meta.number,
          date,
          weeklyHours: meta.weeklyHours,
          checkIns: dayCheckIns,
          plannedMinutes: planned,
          policy,
        }),
      );
    }
  }

  const periodRows = aggregateDailyToPeriod(dailyRows, granularity, locale);

  return {
    granularity,
    from,
    to,
    kpis: computeReportKpis(periodRows),
    rows: periodRows,
    dailyRows,
  };
}

function enumerateDates(from: string, to: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(from + "T12:00:00");
  const end = new Date(to + "T12:00:00");
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
