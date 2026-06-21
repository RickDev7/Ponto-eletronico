import { createClient } from "@/lib/supabase/server";
import type {
  MaterialConsumptionRow,
  MaterialDashboardData,
  MaterialPurchaseRow,
  MaterialRow,
  MaterialServiceLinkRow,
  MaterialUsageRow,
} from "@/lib/materials/material-data";
import { isLowStock } from "@/lib/materials/material-data";

export async function loadMaterials(companyId: string): Promise<MaterialRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("materials")
    .select(`
      *,
      service:services(name)
    `)
    .eq("company_id", companyId)
    .order("name");
  return (data ?? []).map((row) => ({
    ...(row as MaterialRow),
    quantity_on_hand: Number(row.quantity_on_hand),
    min_stock_level: Number(row.min_stock_level),
  }));
}

export async function loadMaterialServiceLinks(companyId: string): Promise<MaterialServiceLinkRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("material_service_links")
    .select(`
      *,
      material:materials(name, unit),
      service:services(name)
    `)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => ({
    ...(row as MaterialServiceLinkRow),
    quantity_per_service: Number(row.quantity_per_service),
  }));
}

export async function loadMaterialPurchases(companyId: string): Promise<MaterialPurchaseRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("material_purchases")
    .select(`
      *,
      material:materials(name, unit)
    `)
    .eq("company_id", companyId)
    .order("purchased_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((row) => ({
    ...(row as MaterialPurchaseRow),
    quantity: Number(row.quantity),
  }));
}

export async function loadMaterialUsage(companyId: string): Promise<MaterialUsageRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("material_usage")
    .select(`
      *,
      material:materials(name, unit),
      employee:employees(full_name),
      task:tasks(title),
      service:services(name)
    `)
    .eq("company_id", companyId)
    .order("used_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((row) => ({
    ...(row as MaterialUsageRow),
    quantity: Number(row.quantity),
  }));
}

export async function loadMaterialConsumption(companyId: string): Promise<MaterialConsumptionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("material_consumption")
    .select(`
      *,
      material:materials(name, unit),
      service:services(name),
      employee:employees(full_name),
      task:tasks(title)
    `)
    .eq("company_id", companyId)
    .order("consumed_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((row) => ({
    ...(row as MaterialConsumptionRow),
    quantity: Number(row.quantity),
  }));
}

export async function loadMaterialDashboard(companyId: string): Promise<MaterialDashboardData> {
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  const [materials, serviceLinks, purchases, usage, consumption] = await Promise.all([
    loadMaterials(companyId),
    loadMaterialServiceLinks(companyId),
    loadMaterialPurchases(companyId),
    loadMaterialUsage(companyId),
    loadMaterialConsumption(companyId),
  ]);

  const activeMaterials = materials.filter((m) => m.is_active);

  return {
    materials,
    serviceLinks,
    purchases,
    usage,
    consumption,
    kpis: {
      total: activeMaterials.length,
      lowStock: activeMaterials.filter((m) => isLowStock(m) && m.quantity_on_hand > 0).length,
      outOfStock: activeMaterials.filter((m) => m.quantity_on_hand <= 0).length,
      purchasesMonth: purchases.filter((p) => p.purchased_at >= monthStartStr).length,
      usageMonth: usage.filter((u) => u.used_at.slice(0, 10) >= monthStartStr).length,
      consumptionMonth: consumption.filter((c) => c.consumed_at.slice(0, 10) >= monthStartStr).length,
    },
  };
}
