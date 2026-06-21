import type { AnalyticsMonthBucket } from "@/lib/finance/analytics-types";
import { loadFinanceAnalytics } from "@/lib/finance/load-finance-analytics";

export interface CashflowAnalyticsMonth {
  key: string;
  label: string;
  inflowCents: number;
  outflowCents: number;
  netCents: number;
  balanceCents: number;
  issuedCents: number;
  receivedCents: number;
  pendingCents: number;
}

export interface FinanceCashflowAnalytics {
  months: CashflowAnalyticsMonth[];
  totalInflowCents: number;
  totalOutflowCents: number;
  netCashflowCents: number;
}

export async function getFinanceCashflowAnalytics(
  slug: string,
  locale: string,
): Promise<FinanceCashflowAnalytics> {
  const analytics = await loadFinanceAnalytics(slug, locale);

  const months: CashflowAnalyticsMonth[] = analytics.monthly.map((m: AnalyticsMonthBucket) => ({
    key: m.key,
    label: m.label,
    inflowCents: m.inflowCents,
    outflowCents: m.outflowCents,
    netCents: m.inflowCents - m.outflowCents,
    balanceCents: m.netCashflowCents,
    issuedCents: m.revenueCents,
    receivedCents: m.receivedCents,
    pendingCents: Math.max(0, m.revenueCents - m.receivedCents),
  }));

  const totalInflowCents = months.reduce((s, m) => s + m.inflowCents, 0);
  const totalOutflowCents = months.reduce((s, m) => s + m.outflowCents, 0);

  return {
    months,
    totalInflowCents,
    totalOutflowCents,
    netCashflowCents: totalInflowCents - totalOutflowCents,
  };
}
