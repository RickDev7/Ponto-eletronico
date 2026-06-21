import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getWeekStartDate } from "@/lib/employee/format-hours";

export interface EmployeeHoursEntry {
  entry_date: string;
  ist_minutes: number;
  balance_delta_minutes: number;
}

export interface EmployeeHoursSummary {
  weekMinutes: number;
  weekBalanceMinutes: number;
  entries: EmployeeHoursEntry[];
}

export async function loadEmployeeHours(
  companyId: string,
  employeeId: string,
): Promise<EmployeeHoursSummary> {
  const supabase = await createClient();
  const weekStartStr = getWeekStartDate();

  const { data } = await supabase
    .from("time_account_entries")
    .select("entry_date, ist_minutes, balance_delta_minutes")
    .eq("company_id", companyId)
    .eq("employee_id", employeeId)
    .gte("entry_date", weekStartStr)
    .order("entry_date", { ascending: false });

  const entries = (data ?? []) as EmployeeHoursEntry[];
  const weekMinutes = entries.reduce((sum, row) => sum + row.ist_minutes, 0);
  const weekBalanceMinutes = entries.reduce((sum, row) => sum + row.balance_delta_minutes, 0);

  return { weekMinutes, weekBalanceMinutes, entries };
}
