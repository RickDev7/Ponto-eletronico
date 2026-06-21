import { loadEquipmentDashboard } from "@/lib/equipment/load-equipment-data";
import { loadMaterialDashboard } from "@/lib/materials/load-material-data";
import { loadVehicleDashboard } from "@/lib/vehicles/load-vehicle-data";

export interface AssetsHubData {
  vehicles: {
    total: number;
    available: number;
    assigned: number;
    inMaintenance: number;
    overdueMaintenance: number;
  };
  equipment: {
    total: number;
    available: number;
    assigned: number;
    inMaintenance: number;
    overdueMaintenance: number;
  };
  materials: {
    total: number;
    lowStock: number;
    outOfStock: number;
    purchasesMonth: number;
  };
}

export async function loadAssetsHubData(companyId: string): Promise<AssetsHubData> {
  const [vehicles, equipment, materials] = await Promise.all([
    loadVehicleDashboard(companyId),
    loadEquipmentDashboard(companyId),
    loadMaterialDashboard(companyId),
  ]);

  return {
    vehicles: vehicles.kpis,
    equipment: equipment.kpis,
    materials: {
      total: materials.kpis.total,
      lowStock: materials.kpis.lowStock,
      outOfStock: materials.kpis.outOfStock,
      purchasesMonth: materials.kpis.purchasesMonth,
    },
  };
}
