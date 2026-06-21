import type { AvailabilityStatus } from "@/lib/workforce/planning-data";

export interface CompanySkillRow {
  id: string;
  company_id: string;
  name: string;
  service_type: string | null;
  description: string | null;
  color: string | null;
  created_at: string;
}

export interface EmployeeSkillRow {
  employee_id: string;
  skill_id: string;
  company_id: string;
  level: number;
  certified_at: string | null;
  skill?: CompanySkillRow | CompanySkillRow[] | null;
}

export interface EmployeeAvailabilityRow {
  employeeId: string;
  fullName: string;
  jobTitle: string | null;
  status: string;
  availability: AvailabilityStatus;
  workloadPct: number;
  plannedMinutes: number;
  contractMinutes: number;
  onVacationToday: boolean;
  onSickToday: boolean;
  skillCount: number;
}

export interface EmployeeHistoryEntry {
  id: string;
  kind: "activity" | "vacation" | "absence" | "document" | "shift";
  action: string;
  label: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

/** Map employeeId → service_type slugs for planning auto-assign */
export function buildEmployeeServiceTypeMap(
  assignments: Array<{ employee_id: string; skill?: { service_type?: string | null } | Array<{ service_type?: string | null }> | null }>,
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of assignments) {
    const skill = Array.isArray(row.skill) ? row.skill[0] : row.skill;
    const st = skill?.service_type;
    if (!st) continue;
    const list = map.get(row.employee_id) ?? [];
    if (!list.includes(st)) list.push(st);
    map.set(row.employee_id, list);
  }
  return map;
}
