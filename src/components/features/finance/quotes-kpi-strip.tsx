"use client";

import { FinanceKpiCard } from "@/components/features/finance/dashboard/finance-kpi-card";
import { computeQuotesKpis, type QuotesKpis } from "@/lib/finance/quotes-data";
import { formatMoney } from "@/lib/finance/utils";

interface QuotesKpiStripProps {
  kpis: QuotesKpis;
  locale: string;
  labels: {
    total: string;
    underReview: string;
    accepted: string;
    rejected: string;
    potential: string;
    conversion: string;
  };
}

export function QuotesKpiStrip({ kpis, labels, locale }: QuotesKpiStripProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <FinanceKpiCard label={labels.total} value={String(kpis.total)} accent="neutral" />
      <FinanceKpiCard label={labels.underReview} value={String(kpis.underReview)} accent="blue" />
      <FinanceKpiCard label={labels.accepted} value={String(kpis.accepted)} accent="emerald" />
      <FinanceKpiCard label={labels.rejected} value={String(kpis.rejected)} accent="rose" />
      <FinanceKpiCard
        label={labels.potential}
        value={formatMoney(kpis.potentialValueCents, "EUR", locale)}
        accent="amber"
      />
      <FinanceKpiCard
        label={labels.conversion}
        value={`${kpis.conversionRate}%`}
        accent="emerald"
      />
    </div>
  );
}

export { computeQuotesKpis };
