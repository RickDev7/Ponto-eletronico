"use client";

import { FinanceKpiCard } from "@/components/features/finance/dashboard/finance-kpi-card";
import { formatMinutes } from "@/lib/workforce/workforce-data";
import type { EmployeesHubKpis } from "@/lib/workforce/employees-hub";

interface EmployeesHubKpiStripProps {
  kpis: EmployeesHubKpis;
  labels: {
    total: string;
    active: string;
    onVacation: string;
    absentToday: string;
    plannedHours: string;
    workedHours: string;
  };
}

export function EmployeesHubKpiStrip({ kpis, labels }: EmployeesHubKpiStripProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <FinanceKpiCard label={labels.total} value={String(kpis.total)} accent="neutral" />
      <FinanceKpiCard label={labels.active} value={String(kpis.active)} accent="emerald" />
      <FinanceKpiCard label={labels.onVacation} value={String(kpis.onVacation)} accent="blue" />
      <FinanceKpiCard label={labels.absentToday} value={String(kpis.absentToday)} accent="amber" />
      <FinanceKpiCard label={labels.plannedHours} value={formatMinutes(kpis.plannedHoursMinutes)} accent="blue" />
      <FinanceKpiCard label={labels.workedHours} value={formatMinutes(kpis.workedHoursMinutes)} accent="emerald" />
    </div>
  );
}
