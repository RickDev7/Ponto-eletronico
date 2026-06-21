import type { FinanceAnalyticsData, AnalyticsRankRow } from "@/lib/finance/analytics-types";
import { loadFinanceAnalytics } from "@/lib/finance/load-finance-analytics";

export interface ProfitabilityRank {
  id: string;
  name: string;
  subtitle?: string;
  revenueCents: number;
  receivedCents: number;
  costCents: number;
  marginCents: number;
  marginPct: number;
  count: number;
}

export interface FinanceProfitabilityData {
  topClients: ProfitabilityRank[];
  topContracts: ProfitabilityRank[];
  byService: ProfitabilityRank[];
  byProperty: ProfitabilityRank[];
  totalReceivedCents: number;
  totalInvoicedCents: number;
  totalCostCents: number;
  grossMarginPct: number;
  costCategories: FinanceAnalyticsData["costCategories"];
}

function mapRank(row: AnalyticsRankRow): ProfitabilityRank {
  return {
    id: row.id,
    name: row.name,
    subtitle: row.subtitle,
    revenueCents: row.revenueCents,
    receivedCents: row.receivedCents,
    costCents: row.costCents,
    marginCents: row.marginCents,
    marginPct: row.marginPct,
    count: row.count,
  };
}

export async function getFinanceProfitabilityData(
  slug: string,
  locale: string,
): Promise<FinanceProfitabilityData> {
  const analytics = await loadFinanceAnalytics(slug, locale);

  return {
    topClients: analytics.byClient.map(mapRank),
    topContracts: [],
    byService: analytics.byService.map(mapRank),
    byProperty: [],
    totalReceivedCents: analytics.summary.receivedCents,
    totalInvoicedCents: analytics.summary.invoicedCents,
    totalCostCents: analytics.summary.costCents,
    grossMarginPct: analytics.summary.grossMarginPct,
    costCategories: analytics.costCategories,
  };
}
