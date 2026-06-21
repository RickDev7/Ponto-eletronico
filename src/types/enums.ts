export type MemberRole = "owner" | "manager" | "admin" | "supervisor" | "employee" | "client";

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

export type PhotoType = "before" | "after" | "signature" | "evidence";

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

/** Tenant-level roles (Super Admin is platform-only via platform_admins). */
export const MEMBER_ROLES: readonly MemberRole[] = [
  "owner",
  "manager",
  "supervisor",
  "employee",
  "client",
] as const;

export const ASSIGNABLE_ROLES: readonly MemberRole[] = [
  "owner",
  "manager",
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
  owner: 4,
  admin: 4,
  manager: 3,
  supervisor: 2,
  employee: 1,
  client: 0,
};

/** Normalize legacy admin role to owner. */
export function normalizeRole(role: MemberRole): MemberRole {
  return role === "admin" ? "owner" : role;
}

export function isClientRole(role: MemberRole): boolean {
  return role === "client";
}

export function isOwnerRole(role: MemberRole): boolean {
  const n = normalizeRole(role);
  return n === "owner";
}

export function hasMinRole(
  userRole: MemberRole,
  minRole: MemberRole,
): boolean {
  return ROLE_RANK[normalizeRole(userRole)] >= ROLE_RANK[normalizeRole(minRole)];
}
