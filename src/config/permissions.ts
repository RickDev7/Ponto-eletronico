import type { MemberRole } from "@/types";

export type Permission =
  | "company:read"
  | "company:update"
  | "members:manage"
  | "employees:read"
  | "employees:write"
  | "employees:delete"
  | "clients:read"
  | "clients:write"
  | "clients:delete"
  | "addresses:read"
  | "addresses:write"
  | "addresses:delete"
  | "tasks:read"
  | "tasks:write"
  | "tasks:delete"
  | "tasks:assign"
  | "checkins:read"
  | "checkins:write"
  | "photos:upload"
  | "photos:delete"
  | "reports:read"
  | "reports:generate"
  | "reports:delete"
  | "activity:read"
  | "vacations:request"
  | "vacations:read"
  | "notifications:read"
  | "invites:manage"
  | "finance:read"
  | "finance:write"
  | "crm:read"
  | "crm:write"
  | "commercial:read"
  | "commercial:write"
  | "automations:read"
  | "automations:write"
  | "portal:read"
  | "ai:read"
  | "support:read"
  | "support:write";

const OWNER_PERMISSIONS: readonly Permission[] = [
  "company:read",
  "company:update",
  "members:manage",
  "employees:read",
  "employees:write",
  "employees:delete",
  "clients:read",
  "clients:write",
  "clients:delete",
  "addresses:read",
  "addresses:write",
  "addresses:delete",
  "tasks:read",
  "tasks:write",
  "tasks:delete",
  "tasks:assign",
  "checkins:read",
  "checkins:write",
  "photos:upload",
  "photos:delete",
  "reports:read",
  "reports:generate",
  "reports:delete",
  "activity:read",
  "invites:manage",
  "finance:read",
  "finance:write",
  "crm:read",
  "crm:write",
  "commercial:read",
  "commercial:write",
  "automations:read",
  "automations:write",
  "ai:read",
  "support:read",
  "support:write",
] as const;

const MANAGER_PERMISSIONS: readonly Permission[] = [
  "company:read",
  "members:manage",
  "employees:read",
  "employees:write",
  "clients:read",
  "clients:write",
  "addresses:read",
  "addresses:write",
  "tasks:read",
  "tasks:write",
  "tasks:delete",
  "tasks:assign",
  "checkins:read",
  "checkins:write",
  "photos:upload",
  "reports:read",
  "reports:generate",
  "activity:read",
  "invites:manage",
  "finance:read",
  "finance:write",
  "crm:read",
  "crm:write",
  "commercial:read",
  "commercial:write",
  "automations:read",
  "automations:write",
  "ai:read",
  "support:read",
  "support:write",
] as const;

const ROLE_PERMISSIONS: Record<MemberRole, readonly Permission[]> = {
  owner: OWNER_PERMISSIONS,
  admin: OWNER_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  supervisor: [
    "company:read",
    "employees:read",
    "employees:write",
    "clients:read",
    "clients:write",
    "addresses:read",
    "addresses:write",
    "tasks:read",
    "tasks:write",
    "tasks:assign",
    "checkins:read",
    "checkins:write",
    "photos:upload",
    "reports:read",
    "reports:generate",
    "activity:read",
    "finance:read",
    "finance:write",
    "crm:read",
    "crm:write",
    "commercial:read",
    "commercial:write",
    "automations:read",
    "automations:write",
    "ai:read",
  ],
  employee: [
    "company:read",
    "tasks:read",
    "checkins:read",
    "checkins:write",
    "photos:upload",
    "activity:read",
    "vacations:request",
    "vacations:read",
    "notifications:read",
  ],
  client: ["company:read", "portal:read"],
};

export function getPermissions(role: MemberRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function can(role: MemberRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function requirePermission(
  role: MemberRole,
  permission: Permission,
): void {
  if (!can(role, permission)) {
    throw new Error(`Permission denied: ${permission} requires higher role`);
  }
}
