"use client";

import { FinanceKpiCard } from "@/components/features/finance/dashboard/finance-kpi-card";
import type { OperationsKpis } from "@/lib/operations/operations-data";

interface OperationsKpiStripProps {
  kpis: OperationsKpis;
  labels: {
    today: string;
    week: string;
    completed: string;
    overdue: string;
    completionRate: string;
    properties: string;
    teams: string;
  };
}

export function OperationsKpiStrip({ kpis, labels }: OperationsKpiStripProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      <FinanceKpiCard label={labels.today} value={String(kpis.todayCount)} accent="blue" />
      <FinanceKpiCard label={labels.week} value={String(kpis.weekCount)} accent="neutral" />
      <FinanceKpiCard label={labels.completed} value={String(kpis.completedWeek)} accent="emerald" />
      <FinanceKpiCard label={labels.overdue} value={String(kpis.overdueCount)} accent="amber" />
      <FinanceKpiCard label={labels.completionRate} value={`${kpis.completionRate}%`} accent="emerald" />
      <FinanceKpiCard label={labels.properties} value={String(kpis.activeProperties)} accent="blue" />
      <FinanceKpiCard label={labels.teams} value={String(kpis.activeTeams)} accent="neutral" />
    </div>
  );
}
