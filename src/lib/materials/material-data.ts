export type MaterialUnit = "piece" | "liter" | "kg" | "meter" | "box" | "other";

export interface MaterialRow {
  id: string;
  company_id: string;
  name: string;
  sku: string | null;
  description: string | null;
  unit: MaterialUnit;
  quantity_on_hand: number;
  min_stock_level: number;
  unit_cost_cents: number | null;
  service_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  service?: { name: string } | Array<{ name: string }> | null;
}

export interface MaterialServiceLinkRow {
  id: string;
  company_id: string;
  material_id: string;
  service_id: string;
  quantity_per_service: number;
  notes: string | null;
  created_at: string;
  material?: { name: string; unit: MaterialUnit } | Array<{ name: string; unit: MaterialUnit }> | null;
  service?: { name: string } | Array<{ name: string }> | null;
}

export interface MaterialPurchaseRow {
  id: string;
  company_id: string;
  material_id: string;
  quantity: number;
  unit_cost_cents: number | null;
  total_cost_cents: number | null;
  vendor: string | null;
  invoice_ref: string | null;
  purchased_at: string;
  notes: string | null;
  created_at: string;
  material?: { name: string; unit: MaterialUnit } | Array<{ name: string; unit: MaterialUnit }> | null;
}

export interface MaterialUsageRow {
  id: string;
  company_id: string;
  material_id: string;
  quantity: number;
  employee_id: string | null;
  task_id: string | null;
  service_id: string | null;
  used_at: string;
  notes: string | null;
  created_at: string;
  material?: { name: string; unit: MaterialUnit } | Array<{ name: string; unit: MaterialUnit }> | null;
  employee?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  task?: { title: string } | Array<{ title: string }> | null;
  service?: { name: string } | Array<{ name: string }> | null;
}

export interface MaterialConsumptionRow {
  id: string;
  company_id: string;
  material_id: string;
  service_id: string;
  quantity: number;
  task_id: string | null;
  employee_id: string | null;
  consumed_at: string;
  notes: string | null;
  created_at: string;
  material?: { name: string; unit: MaterialUnit } | Array<{ name: string; unit: MaterialUnit }> | null;
  service?: { name: string } | Array<{ name: string }> | null;
  employee?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  task?: { title: string } | Array<{ title: string }> | null;
}

export interface MaterialDashboardData {
  materials: MaterialRow[];
  serviceLinks: MaterialServiceLinkRow[];
  purchases: MaterialPurchaseRow[];
  usage: MaterialUsageRow[];
  consumption: MaterialConsumptionRow[];
  kpis: {
    total: number;
    lowStock: number;
    outOfStock: number;
    purchasesMonth: number;
    usageMonth: number;
    consumptionMonth: number;
  };
}

export const MATERIAL_UNITS: MaterialUnit[] = ["piece", "liter", "kg", "meter", "box", "other"];

export function isLowStock(material: MaterialRow): boolean {
  return material.quantity_on_hand <= material.min_stock_level;
}

export function formatQuantity(qty: number, unit: MaterialUnit): string {
  const formatted = Number.isInteger(qty) ? String(qty) : qty.toFixed(2);
  return `${formatted} ${unit}`;
}
