import { createClient } from "@/lib/supabase/server";
import type {
  ExecutionRow,
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
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: property }, { data: tasks }, { data: contracts }] = await Promise.all([
    supabase
      .from("addresses")
      .select("*, client:clients(id, name, email, phone)")
      .eq("id", propertyId)
      .eq("company_id", companyId)
      .single(),
    supabase
      .from("tasks")
      .select(`
        id, title, status, scheduled_date, service_type, approved_at, invoice_id,
        assignments:task_assignments(employee:employees(full_name))
      `)
      .eq("address_id", propertyId)
      .eq("company_id", companyId)
      .neq("status", "cancelled")
      .order("scheduled_date", { ascending: false })
      .limit(40),
    supabase
      .from("contracts")
      .select("id, title, status, frequency, start_date, end_date, is_active")
      .eq("company_id", companyId)
      .eq("address_id", propertyId)
      .eq("is_active", true),
  ]);

  const upcoming =
    tasks?.filter(
      (t) => t.scheduled_date >= today && t.status !== "completed" && !t.approved_at,
    ) ?? [];

  return { property, tasks: tasks ?? [], contracts: contracts ?? [], upcoming };
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

export async function loadExecutions(companyId: string, from?: string, to?: string): Promise<ExecutionRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("tasks")
    .select(`
      id, title, status, scheduled_date, scheduled_start, scheduled_end,
      service_type, approved_at, invoice_id, contract_id, team_id,
      address:addresses(label, street, city, client:clients(name)),
      assignments:task_assignments(employee:employees(full_name))
    `)
    .eq("company_id", companyId)
    .neq("status", "cancelled")
    .order("scheduled_date", { ascending: false });

  if (from) query = query.gte("scheduled_date", from);
  if (to) query = query.lte("scheduled_date", to);

  const { data } = await query.limit(500);
  return (data ?? []) as ExecutionRow[];
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
  return data ?? [];
}
