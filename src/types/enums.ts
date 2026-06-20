export type MemberRole = "admin" | "supervisor" | "employee";

export type MemberStatus = "active" | "invited" | "suspended";

export type ServiceType =
  | "treppenhausreinigung"
  | "gartenpflege"
  | "winterdienst"
  | "glasreinigung";

export type TaskStatus =
  | "draft"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type TaskPriority = "low" | "normal" | "high" | "urgent";

export type PhotoType = "before" | "after";

export type ActivityAction =
  | "created"
  | "updated"
  | "deleted"
  | "assigned"
  | "check_in"
  | "check_out"
  | "photo_uploaded"
  | "status_changed"
  | "report_generated";

export type ReportType =
  | "daily"
  | "weekly"
  | "monthly"
  | "client"
  | "employee"
  | "custom";

export type ClientStatus = "active" | "inactive" | "archived";

export type EmployeeStatus = "active" | "inactive" | "terminated" | "on_vacation" | "absent";

export const MEMBER_ROLES: readonly MemberRole[] = [
  "admin",
  "supervisor",
  "employee",
] as const;

export const SERVICE_TYPES: readonly ServiceType[] = [
  "treppenhausreinigung",
  "gartenpflege",
  "winterdienst",
  "glasreinigung",
] as const;

export const TASK_STATUSES: readonly TaskStatus[] = [
  "draft",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export const ROLE_RANK: Record<MemberRole, number> = {
  admin: 3,
  supervisor: 2,
  employee: 1,
};

export function hasMinRole(
  userRole: MemberRole,
  minRole: MemberRole,
): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[minRole];
}
