import type { AvailabilityStatus } from "@/lib/workforce/planning-data";
import type { WorkforceEmployeeRow } from "@/lib/workforce/workforce-data";

export interface WorkforceEmployeeHubRow extends WorkforceEmployeeRow {
  teamId: string | null;
  teamName: string | null;
  department: string | null;
  skillIds: string[];
  skillNames: string[];
  availability: AvailabilityStatus;
  plannedMinutesWeek: number;
  workedMinutesWeek: number;
  memberRole: string | null;
  hasMobileAccess: boolean;
}

export interface EmployeesHubKpis {
  total: number;
  active: number;
  onVacation: number;
  absentToday: number;
  plannedHoursMinutes: number;
  workedHoursMinutes: number;
}

export function formatEmployeeNotes(department?: string, notes?: string): string | null {
  const lines: string[] = [];
  if (department?.trim()) lines.push(`department:${department.trim()}`);
  if (notes?.trim()) lines.push(notes.trim());
  return lines.length ? lines.join("\n") : null;
}

export function parseDepartmentFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const match = notes.match(/^department:(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

export function computeEmployeesHubKpis(
  employees: WorkforceEmployeeHubRow[],
): EmployeesHubKpis {
  return {
    total: employees.length,
    active: employees.filter((e) => e.status === "active").length,
    onVacation: employees.filter((e) => e.status === "on_vacation").length,
    absentToday: employees.filter((e) => e.status === "absent").length,
    plannedHoursMinutes: employees.reduce((sum, e) => sum + e.plannedMinutesWeek, 0),
    workedHoursMinutes: employees.reduce((sum, e) => sum + e.workedMinutesWeek, 0),
  };
}

export type EmployeeViewMode = "cards" | "table" | "planning";

export type EmployeeHubFilters = {
  query: string;
  status: string;
  teamId: string;
  supervisorId: string;
  skillId: string;
  availability: string;
};

export function filterEmployeesHub(
  employees: WorkforceEmployeeHubRow[],
  filters: EmployeeHubFilters,
): WorkforceEmployeeHubRow[] {
  const q = filters.query.trim().toLowerCase();
  return employees.filter((emp) => {
    if (q) {
      const haystack = [
        emp.full_name,
        emp.email,
        emp.phone,
        emp.job_title,
        emp.teamName,
        emp.department,
        ...emp.skillNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.status !== "all" && emp.status !== filters.status) return false;
    if (filters.teamId !== "all" && emp.teamId !== filters.teamId) return false;
    if (filters.supervisorId !== "all" && emp.supervisor_id !== filters.supervisorId) return false;
    if (filters.skillId !== "all" && !emp.skillIds.includes(filters.skillId)) return false;
    if (filters.availability !== "all" && emp.availability !== filters.availability) return false;
    return true;
  });
}
