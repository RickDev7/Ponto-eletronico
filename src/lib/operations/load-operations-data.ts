import { createClient } from "@/lib/supabase/server";
import { loadProperty360Data } from "@/lib/properties/load-property-360-data";
import { loadTraceableExecutions } from "@/lib/operations/load-operations-hub-data";
import {
  mapTraceableRows,
  TRACEABLE_TASK_SELECT,
  type TraceableExecution,
} from "@/lib/operations/traceable-execution-types";
import type {
  PropertyRow,
  ServiceRow,
  TeamRow,
} from "@/lib/operations/operations-data";

export async function loadProperties(companyId: string): Promise<PropertyRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("addresses")
    .select("*, client:clients(name)")
    .eq("company_id", companyId)
    .order("city");
  return (data ?? []) as PropertyRow[];
}

export async function loadPropertyById(companyId: string, propertyId: string) {
  const data = await loadProperty360Data(companyId, propertyId);
  if (!data) {
    return { property: null, tasks: [], contracts: [], upcoming: [] };
  }
  const tasks = [...data.upcomingVisits, ...data.visitHistory].map((v) => ({
    id: v.id,
    title: v.title,
    status: v.status,
    scheduled_date: v.scheduled_date,
    service_type: v.service_type,
    approved_at: v.approved_at,
    invoice_id: null as string | null,
    assignments: v.assignees.map((name) => ({ employee: { full_name: name } })),
  }));
  return {
    property: { ...data.property, client: data.client },
    tasks,
    contracts: data.contracts,
    upcoming: data.upcomingVisits.map((v) => ({
      id: v.id,
      title: v.title,
      status: v.status,
      scheduled_date: v.scheduled_date,
      approved_at: v.approved_at,
      invoice_id: null as string | null,
    })),
  };
}

export async function loadServices(companyId: string): Promise<ServiceRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("company_id", companyId)
    .order("sort_order")
    .order("name");
  return (data ?? []) as ServiceRow[];
}

export async function loadTeams(companyId: string): Promise<TeamRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teams")
    .select(`
      *,
      supervisor:employees!teams_supervisor_id_fkey(full_name),
      members:team_members(
        employee_id,
        employee:employees(full_name)
      )
    `)
    .eq("company_id", companyId)
    .order("name");
  return (data ?? []) as TeamRow[];
}

export async function loadExecutions(
  companyId: string,
  from?: string,
  to?: string,
): Promise<TraceableExecution[]> {
  return loadTraceableExecutions(companyId, from, to);
}

export async function loadEmployeesForOperations(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select("id, full_name")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("full_name");
  return data ?? [];
}

export async function loadTaskEvents(companyId: string, taskId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_events")
    .select("id, event_type, message, created_at, creator:profiles(full_name)")
    .eq("company_id", companyId)
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function loadSchedulingTasks(companyId: string, from: string, to: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select(`
      id, title, status, service_type, scheduled_date, scheduled_start, priority,
      team_id, service_id,
      address:addresses(label, street, city),
      assignments:task_assignments(employee_id, employee:employees(full_name))
    `)
    .eq("company_id", companyId)
    .gte("scheduled_date", from)
    .lte("scheduled_date", to)
    .neq("status", "cancelled")
    .order("scheduled_date")
    .order("scheduled_start", { ascending: true, nullsFirst: true });

  return (data ?? []).map((row) => {
    const address = row.address as
      | { label: string | null; street: string; city: string }
      | { label: string | null; street: string; city: string }[]
      | null;
    const addressRow = Array.isArray(address) ? address[0] : address;
    return { ...row, address: addressRow ?? null };
  });
}
