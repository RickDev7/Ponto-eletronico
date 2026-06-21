"use client";

import { FinanceKpiCard } from "@/components/features/finance/dashboard/finance-kpi-card";
import type { OperationsHubData } from "@/lib/operations/traceable-execution-types";

interface OperationsHubKpiStripProps {
  kpis: OperationsHubData["kpis"];
  activeContracts: number;
  activeProperties: number;
  activeServices: number;
  labels: {
    today: string;
    week: string;
    completed: string;
    overdue: string;
    traceable: string;
    upcoming: string;
    contracts: string;
    properties: string;
    services: string;
  };
}

export function OperationsHubKpiStrip({
  kpis,
  activeContracts,
  activeProperties,
  activeServices,
  labels,
}: OperationsHubKpiStripProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <FinanceKpiCard label={labels.today} value={String(kpis.todayCount)} accent="blue" />
      <FinanceKpiCard label={labels.week} value={String(kpis.weekCount)} accent="neutral" />
      <FinanceKpiCard label={labels.completed} value={String(kpis.completedWeek)} accent="emerald" />
      <FinanceKpiCard label={labels.overdue} value={String(kpis.overdueCount)} accent="amber" />
      <FinanceKpiCard label={labels.traceable} value={`${kpis.traceablePercent}%`} accent="emerald" />
      <FinanceKpiCard label={labels.upcoming} value={String(kpis.upcomingVisits)} accent="blue" />
      <FinanceKpiCard label={labels.contracts} value={String(activeContracts)} accent="neutral" />
      <FinanceKpiCard label={labels.properties} value={String(activeProperties)} accent="blue" />
      <FinanceKpiCard label={labels.services} value={String(activeServices)} accent="neutral" />
    </div>
  );
}
