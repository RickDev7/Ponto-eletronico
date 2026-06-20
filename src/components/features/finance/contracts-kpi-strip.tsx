"use client";

import { FinanceKpiCard } from "@/components/features/finance/dashboard/finance-kpi-card";
import { computeContractsKpis, type ContractsKpis } from "@/lib/finance/contracts-data";
import { formatMoney } from "@/lib/finance/utils";

interface ContractsKpiStripProps {
  kpis: ContractsKpis;
  locale: string;
  labels: {
    active: string;
    mrr: string;
    arr: string;
    renewals: string;
    expiring: string;
    forecast12m: string;
  };
}

export function ContractsKpiStrip({ kpis, labels, locale }: ContractsKpiStripProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <FinanceKpiCard label={labels.active} value={String(kpis.activeCount)} accent="emerald" />
      <FinanceKpiCard
        label={labels.mrr}
        value={formatMoney(kpis.mrrCents, "EUR", locale)}
        accent="blue"
      />
      <FinanceKpiCard
        label={labels.arr}
        value={formatMoney(kpis.arrCents, "EUR", locale)}
        accent="blue"
      />
      <FinanceKpiCard label={labels.renewals} value={String(kpis.upcomingRenewals)} accent="amber" />
      <FinanceKpiCard label={labels.expiring} value={String(kpis.expiringCount)} accent="rose" />
      <FinanceKpiCard
        label={labels.forecast12m}
        value={formatMoney(kpis.forecast12mCents, "EUR", locale)}
        accent="emerald"
      />
    </div>
  );
}

export { computeContractsKpis };
