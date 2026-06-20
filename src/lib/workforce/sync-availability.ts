import { createClient } from "@/lib/supabase/server";

/** Sync employee status from approved vacations / active absences (on_vacation → active when period ends). */
export async function syncEmployeeAvailabilityStatuses(companyId: string): Promise<void> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: vacations }, { data: absences }, { data: employees }] = await Promise.all([
    supabase
      .from("vacation_requests")
      .select("employee_id, start_date, end_date")
      .eq("company_id", companyId)
      .eq("status", "approved"),
    supabase
      .from("employee_absences")
      .select("employee_id, start_date, end_date")
      .eq("company_id", companyId),
    supabase
      .from("employees")
      .select("id, status")
      .eq("company_id", companyId)
      .not("status", "eq", "terminated"),
  ]);

  const onVacationToday = new Set<string>();
  const absentToday = new Set<string>();

  for (const v of vacations ?? []) {
    if (v.start_date <= today && v.end_date >= today) {
      onVacationToday.add(v.employee_id as string);
    }
  }

  for (const a of absences ?? []) {
    if (a.start_date <= today && a.end_date >= today && !onVacationToday.has(a.employee_id as string)) {
      absentToday.add(a.employee_id as string);
    }
  }

  const updates: Array<{ id: string; status: string }> = [];

  for (const emp of employees ?? []) {
    const id = emp.id as string;
    const current = emp.status as string;
    let next: string | null = null;

    if (onVacationToday.has(id)) {
      if (current !== "on_vacation") next = "on_vacation";
    } else if (absentToday.has(id)) {
      if (current !== "absent") next = "absent";
    } else if (current === "on_vacation" || current === "absent") {
      next = "active";
    }

    if (next) updates.push({ id, status: next });
  }

  await Promise.all(
    updates.map(({ id, status }) =>
      supabase.from("employees").update({ status }).eq("id", id).eq("company_id", companyId),
    ),
  );
}
