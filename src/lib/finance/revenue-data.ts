import { loadFinanceAnalytics } from "@/lib/finance/load-finance-analytics";
import type { FinanceAnalyticsData } from "@/lib/finance/analytics-types";

export type FinanceRevenueData = FinanceAnalyticsData;

export async function getFinanceRevenueData(
  slug: string,
  locale: string,
): Promise<FinanceRevenueData> {
  return loadFinanceAnalytics(slug, locale);
}
