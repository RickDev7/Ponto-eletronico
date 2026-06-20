"use client";

import { FinanceKpiCard } from "@/components/features/finance/dashboard/finance-kpi-card";
import { formatMoney } from "@/lib/finance/utils";
import type { InvoiceKpis } from "@/lib/finance/invoices-data";

interface InvoicesKpiStripProps {
  kpis: InvoiceKpis;
  locale: string;
  labels: {
    monthlyRevenue: string;
    issued: string;
    pending: string;
    paid: string;
    overdue: string;
    projected: string;
    vsPrevious: string;
  };
}

export function InvoicesKpiStrip({ kpis, labels, locale }: InvoicesKpiStripProps) {
  const trendLabel =
    kpis.monthlyRevenueTrend >= 0
      ? `+${kpis.monthlyRevenueTrend}% ${labels.vsPrevious}`
      : `${kpis.monthlyRevenueTrend}% ${labels.vsPrevious}`;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <FinanceKpiCard
        label={labels.monthlyRevenue}
        value={formatMoney(kpis.monthlyRevenueCents, "EUR", locale)}
        trend={{ value: trendLabel, positive: kpis.monthlyRevenueTrend >= 0 }}
        accent="emerald"
      />
      <FinanceKpiCard label={labels.issued} value={String(kpis.issuedCount)} accent="blue" />
      <FinanceKpiCard
        label={labels.pending}
        value={String(kpis.pendingCount)}
        sublabel={formatMoney(kpis.pendingCents, "EUR", locale)}
        accent="amber"
      />
      <FinanceKpiCard
        label={labels.paid}
        value={String(kpis.paidCount)}
        sublabel={formatMoney(kpis.paidCents, "EUR", locale)}
        accent="emerald"
      />
      <FinanceKpiCard
        label={labels.overdue}
        value={String(kpis.overdueCount)}
        sublabel={formatMoney(kpis.overdueCents, "EUR", locale)}
        alert={kpis.overdueCount > 0}
        accent="rose"
      />
      <FinanceKpiCard
        label={labels.projected}
        value={formatMoney(kpis.projectedRevenueCents, "EUR", locale)}
        accent="neutral"
      />
    </div>
  );
}
