export type EquipmentCategory =
  | "vehicle"
  | "tool"
  | "machine"
  | "safety"
  | "consumable"
  | "other";

export type EquipmentStatus = "available" | "assigned" | "maintenance" | "retired";

export type MaintenanceType = "preventive" | "corrective" | "inspection" | "calibration";

export type MaintenanceStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export type EquipmentEventType =
  | "created"
  | "updated"
  | "assigned"
  | "returned"
  | "maintenance_scheduled"
  | "maintenance_completed"
  | "status_changed"
  | "note";

export interface EquipmentRow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  category: EquipmentCategory;
  status: EquipmentStatus;
  serial_number: string | null;
  asset_tag: string | null;
  manufacturer: string | null;
  model: string | null;
  purchase_date: string | null;
  purchase_cost_cents: number | null;
  warranty_until: string | null;
  service_id: string | null;
  default_employee_id: string | null;
  location_notes: string | null;
  created_at: string;
  updated_at: string;
  service?: { name: string } | Array<{ name: string }> | null;
  default_employee?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
}

export interface EquipmentAssignmentRow {
  id: string;
  company_id: string;
  equipment_id: string;
  employee_id: string | null;
  task_id: string | null;
  service_id: string | null;
  assigned_at: string;
  returned_at: string | null;
  notes: string | null;
  assigned_by: string | null;
  created_at: string;
  equipment?: { name: string; asset_tag: string | null } | Array<{ name: string; asset_tag: string | null }> | null;
  employee?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  task?: { title: string } | Array<{ title: string }> | null;
  service?: { name: string } | Array<{ name: string }> | null;
}

export interface EquipmentMaintenanceRow {
  id: string;
  company_id: string;
  equipment_id: string;
  maintenance_type: MaintenanceType;
  status: MaintenanceStatus;
  title: string;
  description: string | null;
  scheduled_date: string | null;
  completed_at: string | null;
  cost_cents: number | null;
  vendor: string | null;
  next_due_date: string | null;
  performed_by: string | null;
  created_at: string;
  updated_at: string;
  equipment?: { name: string; asset_tag: string | null } | Array<{ name: string; asset_tag: string | null }> | null;
}

export interface EquipmentHistoryRow {
  id: string;
  company_id: string;
  equipment_id: string;
  event_type: EquipmentEventType;
  message: string;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  equipment?: { name: string } | Array<{ name: string }> | null;
  profile?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
}

export interface EquipmentDashboardData {
  equipment: EquipmentRow[];
  assignments: EquipmentAssignmentRow[];
  maintenance: EquipmentMaintenanceRow[];
  history: EquipmentHistoryRow[];
  kpis: {
    total: number;
    available: number;
    assigned: number;
    inMaintenance: number;
    overdueMaintenance: number;
  };
}

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  "vehicle",
  "tool",
  "machine",
  "safety",
  "consumable",
  "other",
];

export const EQUIPMENT_STATUSES: EquipmentStatus[] = [
  "available",
  "assigned",
  "maintenance",
  "retired",
];

export const MAINTENANCE_TYPES: MaintenanceType[] = [
  "preventive",
  "corrective",
  "inspection",
  "calibration",
];

export function equipmentStatusTone(status: EquipmentStatus): string {
  switch (status) {
    case "available":
      return "success";
    case "assigned":
      return "info";
    case "maintenance":
      return "warning";
    case "retired":
      return "neutral";
    default:
      return "neutral";
  }
}

export function maintenanceStatusTone(status: MaintenanceStatus): string {
  switch (status) {
    case "scheduled":
      return "info";
    case "in_progress":
      return "warning";
    case "completed":
      return "success";
    case "cancelled":
      return "neutral";
    default:
      return "neutral";
  }
}
