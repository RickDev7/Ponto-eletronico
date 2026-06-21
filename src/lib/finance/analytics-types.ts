import { marginPct } from "@/lib/workforce/planning-profitability-types";

export interface AnalyticsMonthBucket {
  key: string;
  label: string;
  revenueCents: number;
  receivedCents: number;
  costCents: number;
  profitCents: number;
  marginPct: number;
  inflowCents: number;
  outflowCents: number;
  netCashflowCents: number;
}

export interface AnalyticsRankRow {
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

export interface CostCategoryRow {
  key: string;
  labelKey: string;
  cents: number;
  pct: number;
}

export interface FinanceAnalyticsSummary {
  revenueCents: number;
  receivedCents: number;
  invoicedCents: number;
  costCents: number;
  grossProfitCents: number;
  grossMarginPct: number;
  netCashflowCents: number;
  mrrCents: number;
}

export interface FinanceAnalyticsData {
  summary: FinanceAnalyticsSummary;
  monthly: AnalyticsMonthBucket[];
  byClient: AnalyticsRankRow[];
  byService: AnalyticsRankRow[];
  costCategories: CostCategoryRow[];
  yearStart: string;
}

export { marginPct };

export function computeMargin(revenueCents: number, costCents: number) {
  return {
    marginCents: revenueCents - costCents,
    marginPct: marginPct(revenueCents, costCents),
  };
}

export function rankAnalytics(
  entries: Map<string, { name: string; subtitle?: string; revenue: number; received: number; cost: number; count: number }>,
  limit = 10,
): AnalyticsRankRow[] {
  return [...entries.entries()]
    .map(([id, v]) => {
      const { marginCents, marginPct: pct } = computeMargin(v.revenue, v.cost);
      return {
        id,
        name: v.name,
        subtitle: v.subtitle,
        revenueCents: v.revenue,
        receivedCents: v.received,
        costCents: v.cost,
        marginCents,
        marginPct: pct,
        count: v.count,
      };
    })
    .sort((a, b) => b.marginCents - a.marginCents || b.receivedCents - a.receivedCents)
    .slice(0, limit);
}

export function buildCostCategories(
  buckets: {
    labor: number;
    materials: number;
    maintenance: number;
    tax: number;
    expenses: number;
    discounts: number;
  },
): CostCategoryRow[] {
  const total =
    buckets.labor +
    buckets.materials +
    buckets.maintenance +
    buckets.tax +
    buckets.expenses +
    buckets.discounts;

  const rows: CostCategoryRow[] = [
    { key: "labor", labelKey: "labor", cents: buckets.labor, pct: 0 },
    { key: "materials", labelKey: "materials", cents: buckets.materials, pct: 0 },
    { key: "maintenance", labelKey: "maintenance", cents: buckets.maintenance, pct: 0 },
    { key: "tax", labelKey: "tax", cents: buckets.tax, pct: 0 },
    { key: "expenses", labelKey: "expenses", cents: buckets.expenses, pct: 0 },
    { key: "discounts", labelKey: "discounts", cents: buckets.discounts, pct: 0 },
  ].filter((r) => r.cents > 0);

  for (const row of rows) {
    row.pct = total > 0 ? Math.round((row.cents / total) * 100) : 0;
  }

  return rows.sort((a, b) => b.cents - a.cents);
}
