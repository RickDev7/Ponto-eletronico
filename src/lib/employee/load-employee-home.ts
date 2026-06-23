import "server-only";

import { createClient } from "@/lib/supabase/server";
import { loadEmployeeJobs, type EmployeeJobRow } from "@/lib/employee/load-employee-jobs";

export interface EmployeeHomeData {
  today: string;
  firstName: string;
  todayJobsCount: number;
  pendingCount: number;
  inProgressCount: number;
  hoursPlannedMinutes: number;
  hoursWorkedMinutes: number;
  nextJob: EmployeeJobRow | null;
  currentJob: EmployeeJobRow | null;
  activeTaskId: string | null;
  jobs: EmployeeJobRow[];
}

function parseMinutes(start?: string | null, end?: string | null) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

export async function loadEmployeeHome(
  companyId: string,
  employeeId: string,
  profileName: string | null,
): Promise<EmployeeHomeData> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const todayStart = `${today}T00:00:00.000Z`;
  const todayEnd = `${today}T23:59:59.999Z`;

  const [jobData, { data: todayCheckIns }] = await Promise.all([
    loadEmployeeJobs(companyId, employeeId),
    supabase
      .from("check_ins")
      .select("check_in_at, check_out_at, task_id")
      .eq("employee_id", employeeId)
      .eq("company_id", companyId)
      .gte("check_in_at", todayStart)
      .lte("check_in_at", todayEnd),
  ]);

  const todayJobs = jobData.todayJobs;
  const hoursPlannedMinutes = todayJobs.reduce(
    (sum, j) => sum + parseMinutes(j.scheduled_start, j.scheduled_end),
    0,
  );

  const hoursWorkedMinutes = (todayCheckIns ?? []).reduce((sum, ci) => {
    if (!ci.check_out_at) {
      return sum + Math.floor((Date.now() - new Date(ci.check_in_at).getTime()) / 60_000);
    }
    return (
      sum +
      Math.floor(
        (new Date(ci.check_out_at).getTime() - new Date(ci.check_in_at).getTime()) / 60_000,
      )
    );
  }, 0);

  const sortedToday = [...todayJobs].sort((a, b) =>
    (a.scheduled_start ?? "").localeCompare(b.scheduled_start ?? ""),
  );

  const currentJob =
    jobData.activeTaskId != null
      ? todayJobs.find((j) => j.id === jobData.activeTaskId) ??
        jobData.inProgress.find((j) => j.id === jobData.activeTaskId) ??
        null
      : null;

  const nextJob =
    sortedToday.find(
      (j) =>
        j.id !== jobData.activeTaskId &&
        !["completed", "cancelled"].includes(j.status),
    ) ?? null;

  return {
    today,
    firstName: profileName?.split(" ")[0] ?? "",
    todayJobsCount: todayJobs.length,
    pendingCount: jobData.pending.filter((j) => j.scheduled_date <= today).length,
    inProgressCount: jobData.inProgress.length,
    hoursPlannedMinutes,
    hoursWorkedMinutes,
    nextJob,
    currentJob,
    activeTaskId: jobData.activeTaskId,
    jobs: sortedToday,
  };
}
