export type VehicleStatus = "available" | "assigned" | "maintenance" | "retired";

export type VehicleFuelType = "gasoline" | "diesel" | "electric" | "hybrid" | "other";

export type VehicleUsagePurpose = "shift" | "delivery" | "commute" | "other";

export type MaintenanceType = "preventive" | "corrective" | "inspection" | "calibration";

export type MaintenanceStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export interface VehicleRow {
  id: string;
  company_id: string;
  name: string;
  plate_number: string | null;
  vin: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  fuel_type: VehicleFuelType;
  status: VehicleStatus;
  odometer_km: number;
  default_driver_id: string | null;
  team_id: string | null;
  insurance_until: string | null;
  inspection_until: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  default_driver?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  team?: { name: string } | Array<{ name: string }> | null;
}

export interface VehicleDriverRow {
  id: string;
  company_id: string;
  vehicle_id: string;
  employee_id: string;
  is_primary: boolean;
  license_number: string | null;
  license_expires: string | null;
  assigned_at: string;
  ended_at: string | null;
  notes: string | null;
  vehicle?: { name: string; plate_number: string | null } | Array<{ name: string; plate_number: string | null }> | null;
  employee?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
}

export interface VehicleMaintenanceRow {
  id: string;
  company_id: string;
  vehicle_id: string;
  maintenance_type: MaintenanceType;
  status: MaintenanceStatus;
  title: string;
  description: string | null;
  scheduled_date: string | null;
  completed_at: string | null;
  cost_cents: number | null;
  vendor: string | null;
  odometer_km: number | null;
  next_due_date: string | null;
  next_due_odometer_km: number | null;
  created_at: string;
  vehicle?: { name: string; plate_number: string | null } | Array<{ name: string; plate_number: string | null }> | null;
}

export interface VehicleUsageRow {
  id: string;
  company_id: string;
  vehicle_id: string;
  employee_id: string | null;
  task_id: string | null;
  purpose: VehicleUsagePurpose;
  started_at: string;
  ended_at: string | null;
  odometer_start: number | null;
  odometer_end: number | null;
  distance_km: number | null;
  notes: string | null;
  vehicle?: { name: string; plate_number: string | null } | Array<{ name: string; plate_number: string | null }> | null;
  employee?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  task?: { title: string; scheduled_date: string } | Array<{ title: string; scheduled_date: string }> | null;
}

export interface VehicleDashboardData {
  vehicles: VehicleRow[];
  drivers: VehicleDriverRow[];
  maintenance: VehicleMaintenanceRow[];
  usage: VehicleUsageRow[];
  kpis: {
    total: number;
    available: number;
    assigned: number;
    inMaintenance: number;
    activeDrivers: number;
    activeUsage: number;
    overdueMaintenance: number;
  };
}

export const VEHICLE_FUEL_TYPES: VehicleFuelType[] = [
  "gasoline",
  "diesel",
  "electric",
  "hybrid",
  "other",
];

export const VEHICLE_USAGE_PURPOSES: VehicleUsagePurpose[] = [
  "shift",
  "delivery",
  "commute",
  "other",
];
