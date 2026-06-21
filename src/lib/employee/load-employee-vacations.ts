import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface EmployeeVacationRow {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  notes: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface EmployeeVacationSummary {
  pending: number;
  approvedUpcoming: number;
  totalDaysApproved: number;
}

function daysInclusive(start: string, end: string) {
  const a = new Date(`${start}T12:00:00`);
  const b = new Date(`${end}T12:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

export async function loadEmployeeVacationRequests(
  companyId: string,
  employeeId: string,
) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("vacation_requests")
    .select("id, start_date, end_date, status, notes, approved_at, created_at")
    .eq("company_id", companyId)
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  const requests = (data ?? []) as EmployeeVacationRow[];

  const summary: EmployeeVacationSummary = {
    pending: requests.filter((r) => r.status === "pending").length,
    approvedUpcoming: requests.filter(
      (r) => r.status === "approved" && r.end_date >= today,
    ).length,
    totalDaysApproved: requests
      .filter((r) => r.status === "approved")
      .reduce((sum, r) => sum + daysInclusive(r.start_date, r.end_date), 0),
  };

  return { requests, summary };
}
