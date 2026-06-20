"use client";

import { FinanceKpiCard } from "@/components/features/finance/dashboard/finance-kpi-card";
import type { CrmDashboardKpis } from "@/lib/crm/leads-data";
import { formatMoney } from "@/lib/finance/utils";

interface CrmKpiStripProps {
  kpis: CrmDashboardKpis;
  locale: string;
  labels: {
    active: string;
    proposals: string;
    conversion: string;
    potential: string;
    closed: string;
    wonMonth: string;
  };
}

export function CrmKpiStrip({ kpis, labels, locale }: CrmKpiStripProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <FinanceKpiCard label={labels.active} value={String(kpis.activeLeads)} accent="blue" />
      <FinanceKpiCard label={labels.proposals} value={String(kpis.proposalsSent)} accent="amber" />
      <FinanceKpiCard label={labels.conversion} value={`${kpis.conversionRate}%`} accent="emerald" />
      <FinanceKpiCard
        label={labels.potential}
        value={formatMoney(kpis.potentialRevenueCents, "EUR", locale)}
        accent="blue"
      />
      <FinanceKpiCard
        label={labels.closed}
        value={formatMoney(kpis.closedRevenueCents, "EUR", locale)}
        accent="emerald"
      />
      <FinanceKpiCard label={labels.wonMonth} value={String(kpis.wonThisMonth)} accent="emerald" />
    </div>
  );
}
