import type { TaskStatus } from "@/types";

export type ExecutionDisplayStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "approved"
  | "billed";

export interface PropertyRow {
  id: string;
  client_id: string;
  label: string | null;
  street: string;
  house_number: string | null;
  postal_code: string;
  city: string;
  property_type: string | null;
  area_sqm: number | null;
  latitude: number | null;
  longitude: number | null;
  service_types: string[];
  is_active: boolean;
  client?: { name: string } | Array<{ name: string }> | null;
}

export interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  estimated_duration_minutes: number;
  frequency: string | null;
  color: string;
  default_checklist: Array<{ label: string }>;
  legacy_service_type: string | null;
  is_active: boolean;
}

export interface TeamRow {
  id: string;
  name: string;
  supervisor_id: string | null;
  vehicle_info: string | null;
  is_active: boolean;
  supervisor?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  members?: Array<{
    employee_id: string;
    employee?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  }>;
}

export interface ExecutionRow {
  id: string;
  title: string;
  status: TaskStatus;
  scheduled_date: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  service_type: string;
  approved_at: string | null;
  invoice_id: string | null;
  contract_id: string | null;
  team_id: string | null;
  address?: {
    label: string | null;
    street: string;
    city: string;
    client?: { name: string } | Array<{ name: string }> | null;
  } | null;
  assignments?: Array<{
    employee?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  }>;
}

export interface OperationsKpis {
  todayCount: number;
  weekCount: number;
  completedWeek: number;
  overdueCount: number;
  completionRate: number;
  activeProperties: number;
  activeTeams: number;
}

export function clientNameFromProperty(row: PropertyRow): string {
  const c = row.client;
  if (!c) return "—";
  return Array.isArray(c) ? c[0]?.name ?? "—" : c.name;
}

export function resolveExecutionStatus(row: Pick<ExecutionRow, "status" | "approved_at" | "invoice_id">): ExecutionDisplayStatus {
  if (row.invoice_id) return "billed";
  if (row.approved_at) return "approved";
  if (row.status === "in_progress") return "in_progress";
  if (row.status === "completed") return "completed";
  return "planned";
}

export function computeOperationsKpis(
  executions: ExecutionRow[],
  properties: PropertyRow[],
  teams: TeamRow[],
): OperationsKpis {
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const open = executions.filter((e) => e.status !== "cancelled");
  const todayCount = open.filter((e) => e.scheduled_date === today).length;
  const weekCount = open.filter(
    (e) => e.scheduled_date >= weekStartStr && e.scheduled_date <= weekEndStr,
  ).length;
  const completedWeek = open.filter(
    (e) =>
      e.scheduled_date >= weekStartStr &&
      e.scheduled_date <= weekEndStr &&
      (e.status === "completed" || e.approved_at),
  ).length;
  const overdueCount = open.filter(
    (e) =>
      e.scheduled_date < today &&
      e.status !== "completed" &&
      e.status !== "cancelled" &&
      !e.approved_at,
  ).length;
  const dueWeek = open.filter(
    (e) => e.scheduled_date >= weekStartStr && e.scheduled_date <= weekEndStr,
  ).length;

  return {
    todayCount,
    weekCount,
    completedWeek,
    overdueCount,
    completionRate: dueWeek === 0 ? 0 : Math.round((completedWeek / dueWeek) * 100),
    activeProperties: properties.filter((p) => p.is_active).length,
    activeTeams: teams.filter((t) => t.is_active).length,
  };
}

export interface RouteStop {
  taskId: string;
  title: string;
  addressLabel: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  scheduledStart: string | null;
  order: number;
}

export interface EmployeeRoute {
  employeeId: string;
  employeeName: string;
  stops: RouteStop[];
  estimatedMinutes: number;
}

export function buildDailyRoutes(
  executions: ExecutionRow[],
  date: string,
): EmployeeRoute[] {
  const dayTasks = executions.filter(
    (e) => e.scheduled_date === date && e.status !== "cancelled",
  );
  const byEmployee = new Map<string, EmployeeRoute>();

  for (const task of dayTasks) {
    const assignees = task.assignments ?? [];
    const emp = assignees[0]?.employee;
    const empRow = Array.isArray(emp) ? emp[0] : emp;
    const employeeId = empRow?.full_name ?? "unassigned";
    const employeeName = empRow?.full_name ?? "Não atribuído";

    if (!byEmployee.has(employeeId)) {
      byEmployee.set(employeeId, {
        employeeId,
        employeeName,
        stops: [],
        estimatedMinutes: 0,
      });
    }

    const route = byEmployee.get(employeeId)!;
    const addr = task.address;
    route.stops.push({
      taskId: task.id,
      title: task.title,
      addressLabel: addr
        ? `${addr.street}, ${addr.city}`
        : "—",
      city: addr?.city ?? "—",
      latitude: null,
      longitude: null,
      scheduledStart: task.scheduled_start,
      order: route.stops.length + 1,
    });
    route.estimatedMinutes += 60;
  }

  return Array.from(byEmployee.values());
}
