import type { FinanceAnalyticsData } from "@/lib/finance/analytics-types";
import { loadFinanceAnalytics } from "@/lib/finance/load-finance-analytics";

export interface CostsMonthBucket {
  key: string;
  label: string;
  costCents: number;
  laborCents: number;
  materialsCents: number;
  maintenanceCents: number;
  taxCents: number;
  expensesCents: number;
}

export interface FinanceCostsData {
  totalCostCents: number;
  costCategories: FinanceAnalyticsData["costCategories"];
  monthlyBuckets: CostsMonthBucket[];
  grossMarginPct: number;
  revenueCents: number;
}

export async function getFinanceCostsData(
  slug: string,
  locale: string,
): Promise<FinanceCostsData> {
  const analytics = await loadFinanceAnalytics(slug, locale);

  return {
    totalCostCents: analytics.summary.costCents,
    costCategories: analytics.costCategories,
    monthlyBuckets: analytics.monthly.map((m) => ({
      key: m.key,
      label: m.label,
      costCents: m.costCents,
      laborCents: 0,
      materialsCents: 0,
      maintenanceCents: 0,
      taxCents: 0,
      expensesCents: 0,
    })),
    grossMarginPct: analytics.summary.grossMarginPct,
    revenueCents: analytics.summary.revenueCents,
  };
}
