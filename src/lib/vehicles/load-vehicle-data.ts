import { createClient } from "@/lib/supabase/server";
import type {
  VehicleDashboardData,
  VehicleDriverRow,
  VehicleMaintenanceRow,
  VehicleRow,
  VehicleUsageRow,
} from "@/lib/vehicles/vehicle-data";

export async function loadVehicles(companyId: string): Promise<VehicleRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select(`
      *,
      default_driver:employees(full_name),
      team:teams(name)
    `)
    .eq("company_id", companyId)
    .order("name");
  return (data ?? []) as VehicleRow[];
}

export async function loadAvailableVehicles(companyId: string): Promise<VehicleRow[]> {
  const vehicles = await loadVehicles(companyId);
  return vehicles.filter((v) => v.status === "available" || v.status === "assigned");
}

export async function loadVehicleDrivers(companyId: string): Promise<VehicleDriverRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicle_drivers")
    .select(`
      *,
      vehicle:vehicles(name, plate_number),
      employee:employees(full_name)
    `)
    .eq("company_id", companyId)
    .order("assigned_at", { ascending: false })
    .limit(200);
  return (data ?? []) as VehicleDriverRow[];
}

export async function loadVehicleMaintenance(companyId: string): Promise<VehicleMaintenanceRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicle_maintenance")
    .select(`
      *,
      vehicle:vehicles(name, plate_number)
    `)
    .eq("company_id", companyId)
    .order("scheduled_date", { ascending: false, nullsFirst: false })
    .limit(200);
  return (data ?? []) as VehicleMaintenanceRow[];
}

export async function loadVehicleUsage(companyId: string): Promise<VehicleUsageRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicle_usage")
    .select(`
      *,
      vehicle:vehicles(name, plate_number),
      employee:employees(full_name),
      task:tasks(title, scheduled_date)
    `)
    .eq("company_id", companyId)
    .order("started_at", { ascending: false })
    .limit(200);
  return (data ?? []) as VehicleUsageRow[];
}

export async function loadVehicleDashboard(companyId: string): Promise<VehicleDashboardData> {
  const today = new Date().toISOString().slice(0, 10);
  const [vehicles, drivers, maintenance, usage] = await Promise.all([
    loadVehicles(companyId),
    loadVehicleDrivers(companyId),
    loadVehicleMaintenance(companyId),
    loadVehicleUsage(companyId),
  ]);

  const activeDrivers = drivers.filter((d) => !d.ended_at);
  const activeUsage = usage.filter((u) => !u.ended_at);
  const overdueMaintenance = maintenance.filter(
    (m) =>
      m.status !== "completed" &&
      m.status !== "cancelled" &&
      m.next_due_date &&
      m.next_due_date < today,
  ).length;

  return {
    vehicles,
    drivers,
    maintenance,
    usage,
    kpis: {
      total: vehicles.length,
      available: vehicles.filter((v) => v.status === "available").length,
      assigned: vehicles.filter((v) => v.status === "assigned").length,
      inMaintenance: vehicles.filter((v) => v.status === "maintenance").length,
      activeDrivers: activeDrivers.length,
      activeUsage: activeUsage.length,
      overdueMaintenance,
    },
  };
}

export interface TaskVehicleUsage {
  usageId: string;
  taskId: string;
  vehicleId: string;
  vehicleName: string;
  vehiclePlate: string | null;
}

export async function loadActiveVehicleUsageByTasks(
  companyId: string,
  taskIds: string[],
): Promise<Map<string, TaskVehicleUsage>> {
  const map = new Map<string, TaskVehicleUsage>();
  if (!taskIds.length) return map;

  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicle_usage")
    .select(`
      id, task_id, vehicle_id,
      vehicle:vehicles(name, plate_number)
    `)
    .eq("company_id", companyId)
    .in("task_id", taskIds)
    .is("ended_at", null);

  for (const row of data ?? []) {
    const taskId = row.task_id as string;
    if (!taskId) continue;
    const vehicle = Array.isArray(row.vehicle) ? row.vehicle[0] : row.vehicle;
    map.set(taskId, {
      usageId: row.id as string,
      taskId,
      vehicleId: row.vehicle_id as string,
      vehicleName: (vehicle as { name?: string } | null)?.name ?? "—",
      vehiclePlate: (vehicle as { plate_number?: string | null } | null)?.plate_number ?? null,
    });
  }
  return map;
}
