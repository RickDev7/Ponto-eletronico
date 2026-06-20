/** Default labor rate when no employee-specific cost exists (€18/h). */
export const DEFAULT_LABOR_RATE_CENTS = 1800;

export interface PlanningProfitRow {
  id: string;
  name: string;
  revenueCents: number;
  laborCostCents: number;
  marginCents: number;
  marginPct: number;
  shiftCount: number;
}

export interface PlanningProfitability {
  byEmployee: PlanningProfitRow[];
  byClient: PlanningProfitRow[];
  totalRevenueCents: number;
  totalLaborCents: number;
  totalMarginCents: number;
}

export function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function marginPct(revenue: number, cost: number): number {
  if (revenue <= 0) return cost > 0 ? -100 : 0;
  return Math.round(((revenue - cost) / revenue) * 100);
}
