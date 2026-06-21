import { createClient } from "@/lib/supabase/server";
import type {
  EquipmentAssignmentRow,
  EquipmentDashboardData,
  EquipmentHistoryRow,
  EquipmentMaintenanceRow,
  EquipmentRow,
} from "@/lib/equipment/equipment-data";

export async function loadEquipment(companyId: string): Promise<EquipmentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("equipment")
    .select(`
      *,
      service:services(name),
      default_employee:employees(full_name)
    `)
    .eq("company_id", companyId)
    .order("name");
  return (data ?? []) as EquipmentRow[];
}

export async function loadEquipmentAssignments(companyId: string): Promise<EquipmentAssignmentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("equipment_assignments")
    .select(`
      *,
      equipment:equipment(name, asset_tag),
      employee:employees(full_name),
      task:tasks(title),
      service:services(name)
    `)
    .eq("company_id", companyId)
    .order("assigned_at", { ascending: false })
    .limit(200);
  return (data ?? []) as EquipmentAssignmentRow[];
}

export async function loadEquipmentMaintenance(companyId: string): Promise<EquipmentMaintenanceRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("equipment_maintenance")
    .select(`
      *,
      equipment:equipment(name, asset_tag)
    `)
    .eq("company_id", companyId)
    .order("scheduled_date", { ascending: false, nullsFirst: false })
    .limit(200);
  return (data ?? []) as EquipmentMaintenanceRow[];
}

export async function loadEquipmentHistory(companyId: string): Promise<EquipmentHistoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("equipment_history")
    .select(`
      *,
      equipment:equipment(name),
      profile:profiles(full_name)
    `)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []) as EquipmentHistoryRow[];
}

export async function loadEquipmentDashboard(companyId: string): Promise<EquipmentDashboardData> {
  const today = new Date().toISOString().slice(0, 10);
  const [equipment, assignments, maintenance, history] = await Promise.all([
    loadEquipment(companyId),
    loadEquipmentAssignments(companyId),
    loadEquipmentMaintenance(companyId),
    loadEquipmentHistory(companyId),
  ]);

  const overdueMaintenance = maintenance.filter(
    (m) =>
      m.status !== "completed" &&
      m.status !== "cancelled" &&
      m.next_due_date &&
      m.next_due_date < today,
  ).length;

  return {
    equipment,
    assignments,
    maintenance,
    history,
    kpis: {
      total: equipment.length,
      available: equipment.filter((e) => e.status === "available").length,
      assigned: equipment.filter((e) => e.status === "assigned").length,
      inMaintenance: equipment.filter((e) => e.status === "maintenance").length,
      overdueMaintenance,
    },
  };
}
